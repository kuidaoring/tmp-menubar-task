import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import {
  DayOfTheWeek,
  Repeat,
  Step,
  StepMutation,
  Task,
  TaskMutation,
  dayNumberMap,
} from "../../task";
import { InferResultType } from "./inferResultType";
import { nanoid } from "nanoid";
import {
  addMonths,
  formatISO,
  getDay,
  isSameMonth,
  isToday,
  isValid,
  lastDayOfMonth,
  nextDay,
  parseISO,
  setDate,
  startOfToday,
} from "date-fns";
import { eq, isNotNull } from "drizzle-orm";
import cron from "node-cron";

const sqlite = new Database("app.db");
const db = drizzle(sqlite, { schema });

export const Filters = ["all", "today", "planned"] as const;
export function isValidFilter(type?: string): type is FilterType {
  return Filters.includes(type as FilterType);
}
export type FilterType = (typeof Filters)[number];
export async function getTasks(filterType: FilterType) {
  let where;
  const a = () => {};
  if (filterType === "today") {
    where = eq(schema.taskTable.isToday, true);
  } else if (filterType === "planned") {
    where = isNotNull(schema.taskTable.dueDate);
  }
  return (
    await db.query.taskTable.findMany({
      with: {
        steps: true,
      },
      orderBy: (taskTable, { desc }) => [desc(taskTable.dueDate)],
      where: where,
    })
  ).map(mapTaskEntityToTask);
}

export async function getTask(id: string) {
  const task = await db.query.taskTable.findFirst({
    where: (taskTable, { eq }) => {
      return eq(taskTable.id, id);
    },
    with: {
      steps: true,
    },
  });
  return task ? mapTaskEntityToTask(task) : undefined;
}

export async function createTask(values: TaskMutation) {
  const repeat = buildRepeatEntityFromTask(values);
  const insertEntity = {
    id: values.id || nanoid(),
    title: values.title || "タイトル未設定",
    dueDate:
      values.dueDate && isValid(parseISO(values.dueDate))
        ? values.dueDate
        : undefined,
    isToday: values.isToday || false,
    completed: values.completed || false,
    createdAt: new Date().toISOString(),
    memo: values.memo || "",
    repeatCreated: false,
    repeatType: repeat?.repeatType || null,
    repeatDayOfTheWeeks: repeat?.repeatDayOfTheWeeks || null,
    repeatDays: repeat?.repeatDays || null,
  };
  const task = await db
    .insert(schema.taskTable)
    .values(insertEntity)
    .returning();
  return mapTaskEntityToTask(task[0]);
}

export async function updateTask(id: string, values: TaskMutation) {
  const task = await getTask(id);
  if (task === undefined) {
    undefined;
  }
  const mergedEntity = mapTaskToTaskEntity({ ...task, ...values } as Task);

  if (values.completed === true) {
    if (task?.repeat && !task.repeatCreated) {
      await createRepeatNextTask(task);
      mergedEntity.repeatCreated = true;
    }
  }
  await db
    .update(schema.taskTable)
    .set(mergedEntity)
    .where(eq(schema.taskTable.id, id));
  return getTask(id);
}

async function createRepeatNextTask(task: Task) {
  const nextTask = {
    ...task,
    id: nanoid(),
    completed: false,
    isToday: false,
    steps: structuredClone(task.steps).map((step) => {
      return { ...step, id: nanoid(), completed: false };
    }),
  };

  const baseDueDate = parseISO(task.dueDate ?? startOfToday().toISOString());
  if (nextTask.repeat?.type === "weekly") {
    if (nextTask.repeat.dayOfTheWeeks.length < 1) {
      return;
    }
    const dueDateDay = getDay(baseDueDate);
    let nextDayNumber = nextTask.repeat.dayOfTheWeeks
      .map((day) => dayNumberMap[day])
      .find((dayNumber) => dayNumber > dueDateDay);
    if (!nextDayNumber) {
      nextDayNumber = nextTask.repeat.dayOfTheWeeks
        .map((day) => dayNumberMap[day])
        .find((dayNumber) => dayNumber <= dueDateDay);
    }
    if (!nextDayNumber) {
      return;
    }
    nextTask.dueDate = nextDay(baseDueDate, nextDayNumber).toISOString();
  } else if (nextTask.repeat?.type === "monthly") {
    if (nextTask.repeat.days.length < 1) {
      return;
    }
    let dueDate = setDate(addMonths(baseDueDate, 1), nextTask.repeat.days[0]);
    if (!isSameMonth(dueDate, addMonths(baseDueDate, 1))) {
      dueDate = lastDayOfMonth(addMonths(baseDueDate, 1));
    }
    nextTask.dueDate = dueDate.toISOString();
  } else {
    return;
  }
  const nextTaskEntity = await createTask(nextTask);
  for (const step of structuredClone(nextTask.steps)) {
    await createStep(nextTaskEntity.id, step.title);
  }
  return nextTaskEntity;
}

export async function deleteTask(id: string) {
  await db.delete(schema.taskTable).where(eq(schema.taskTable.id, id));
}

export async function createStep(
  taskId: string,
  title: string
): Promise<Step | undefined> {
  const task = await getTask(taskId);
  if (!task) {
    return;
  }
  const stepEntity = await db
    .insert(schema.stepTable)
    .values({
      id: nanoid(),
      taskId: taskId,
      title: title,
      completed: false,
    })
    .returning();
  return stepEntity[0];
}

export async function updateStep(id: string, values: StepMutation) {
  const step = await db.query.stepTable.findFirst({
    where: (stepTable, { eq }) => {
      return eq(stepTable.id, id);
    },
  });
  await db
    .update(schema.stepTable)
    .set(values)
    .where(eq(schema.stepTable.id, id));
}

export async function deleteStep(id: string) {
  await db.delete(schema.stepTable).where(eq(schema.stepTable.id, id));
}

function mapTaskEntityToTask(task: TaskWithStepEntity | TaskEntity): Task {
  return {
    id: task.id,
    title: task.title,
    dueDate: task.dueDate ?? undefined,
    isToday: task.isToday,
    completed: task.completed,
    memo: task.memo,
    repeat: buildRepeatFromTaskEntity(task),
    repeatCreated: task.repeatCreated,
    steps:
      "steps" in task
        ? task.steps.map((step) => ({
            ...step,
          }))
        : [],
    createdAt: task.createdAt,
  };
}

function buildRepeatFromTaskEntity(
  taskEntity: TaskWithStepEntity | TaskEntity
): Repeat | undefined {
  if (taskEntity.repeatType === "weekly") {
    return {
      type: "weekly",
      dayOfTheWeeks: taskEntity.repeatDayOfTheWeeks
        ? (taskEntity.repeatDayOfTheWeeks.split(",") as DayOfTheWeek[])
        : [],
    };
  } else if (taskEntity.repeatType === "monthly") {
    return {
      type: "monthly",
      days: taskEntity.repeatDays
        ? taskEntity.repeatDays.split(",").map((d) => parseInt(d, 10))
        : [],
    };
  }
  return undefined;
}

function buildRepeatEntityFromTask(task: Task | TaskMutation) {
  if (task.repeat?.type === "weekly") {
    return {
      repeatType: "weekly",
      repeatDayOfTheWeeks: task.repeat.dayOfTheWeeks.join(","),
    };
  } else if (task.repeat?.type === "monthly") {
    return {
      repeatType: "monthly",
      repeatDays: task.repeat.days.join(","),
    };
  }
  return undefined;
}

function mapTaskToTaskEntity(task: Task): TaskEntity {
  return {
    id: task.id,
    title: task.title,
    dueDate: task.dueDate ?? null,
    isToday: task.isToday,
    completed: task.completed,
    memo: task.memo,
    repeatType: task.repeat?.type ?? null,
    repeatDayOfTheWeeks:
      task.repeat?.type === "weekly"
        ? task.repeat.dayOfTheWeeks.join(",")
        : null,
    repeatDays:
      task.repeat?.type === "monthly" ? task.repeat.days.join(",") : null,
    repeatCreated: task.repeatCreated,
    createdAt: task.createdAt,
  };
}

type TaskEntity = typeof schema.taskTable.$inferSelect;
type TaskWithStepEntity = InferResultType<"taskTable", { steps: true }>;

async function refreshIsTodayTasks(force = false) {
  if (!force) {
    const lastRefreshedDate = await db.query.lastRefreshed.findFirst({
      where: eq(schema.lastRefreshed.id, "1"),
    });
    if (lastRefreshedDate && isToday(parseISO(lastRefreshedDate.value))) {
      return;
    }
  }
  const beforeIsTodayTasks = await getTasks("today");
  for (const task of beforeIsTodayTasks) {
    await updateTask(task.id, { isToday: false });
  }

  const allTasks = await getTasks("all");
  let toTodayTaskCount = 0;
  for (const task of allTasks) {
    if (task.dueDate && isToday(parseISO(task.dueDate))) {
      await updateTask(task.id, { isToday: true });
      toTodayTaskCount++;
    }
  }
  console.log(
    `refresh isToday task. to false: ${beforeIsTodayTasks.length}. to true: ${toTodayTaskCount}.`
  );
  const refreshedDate = new Date().toISOString();
  await db
    .insert(schema.lastRefreshed)
    .values({ id: "1", value: refreshedDate })
    .onConflictDoUpdate({
      target: schema.lastRefreshed.id,
      set: { value: refreshedDate },
    });
}

refreshIsTodayTasks(true);

const cronTaskList = cron.getTasks();
for (let [key, value] of cronTaskList.entries()) {
  if (key === "refreshIsTodayTasks") {
    value.stop();
    console.log(`stop existing cron task: ${key}`);
    break;
  }
}

cron.schedule(
  "* * * * *",
  async () => {
    refreshIsTodayTasks();
  },
  {
    name: "refreshIsTodayTasks",
  }
);

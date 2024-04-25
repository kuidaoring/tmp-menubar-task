import {
  addMonths,
  getDay,
  isSameMonth,
  isToday,
  lastDayOfMonth,
  nextDay,
  parseISO,
  setDate,
  startOfToday,
} from "date-fns";
import { nanoid } from "nanoid";
import cron from "node-cron";
import { Task, TaskMutation, dayNumberMap, StepMutation } from "~/task";

const fakeTasks = {
  records: {} as Record<string, Task>,

  async getAll() {
    return Object.keys(this.records)
      .map((id) => fakeTasks.records[id])
      .sort((a, b) => {
        return a.createdAt > b.createdAt ? -1 : 1;
      });
  },

  async get(id: string): Promise<Task | null> {
    return fakeTasks.records[id] || null;
  },

  async set(id: string, values: TaskMutation) {
    const task = await fakeTasks.get(id);
    if (!task) {
      return null;
    }
    if (values.completed === true) {
      if (task.repeat && !task.repeatCreated) {
        await fakeTasks.createRepeatNextTask(task);
        values.repeatCreated = true;
      }
    }
    const updatedTask = { ...task, ...values };
    fakeTasks.records[id] = updatedTask;
    return updatedTask;
  },

  async create(values: TaskMutation) {
    const id = values.id || nanoid();
    const title = values.title || "";
    const isToday = values.isToday || false;
    const completed = values.completed || false;
    const createdAt = new Date().toISOString();
    const memo = values.memo || "";
    const steps = values.steps || [];
    const repeatCreated = false;
    this.records[id] = {
      ...values,
      id,
      title,
      isToday,
      completed,
      createdAt,
      memo,
      steps,
      repeatCreated,
    };
    return this.records[id];
  },

  async createRepeatNextTask(task: Task) {
    const nextTask = {
      ...task,
      id: nanoid(),
      completed: false,
      isToday: false,
      steps: structuredClone(task.steps).map((step) => {
        return { ...step, id: nanoid(), completed: false };
      }),
    };

    const baseDueDate = parseISO(
      nextTask.dueDate ?? startOfToday().toISOString()
    );
    if (nextTask.repeat?.type === "monthly") {
      if (nextTask.repeat?.days.length < 1) {
        return;
      }
      let dueDate = setDate(
        addMonths(baseDueDate, 1),
        nextTask.repeat?.days[0]
      );
      if (!isSameMonth(dueDate, addMonths(baseDueDate, 1))) {
        dueDate = lastDayOfMonth(addMonths(baseDueDate, 1));
      }
      nextTask.dueDate = dueDate.toISOString();
    }
    if (nextTask.repeat?.type === "weekly") {
      if (nextTask.repeat?.dayOfTheWeeks.length < 1) {
        return;
      }
      nextTask.repeat?.dayOfTheWeeks.length > 0;
      const dueDateDay = getDay(baseDueDate);
      let nextDayNumber = nextTask.repeat.dayOfTheWeeks
        .map((day) => dayNumberMap[day])
        .find((dayNumber) => dayNumber > dueDateDay);
      if (nextDayNumber === undefined) {
        nextDayNumber = nextTask.repeat.dayOfTheWeeks
          .slice()
          .map((day) => dayNumberMap[day])
          .find((dayNumber) => dayNumber < dueDateDay);
      }
      if (nextDayNumber === undefined) {
        return;
      }
      nextTask.dueDate = nextDay(baseDueDate, nextDayNumber).toISOString();
    }
    fakeTasks.create(nextTask);
  },

  async delete(id: string) {
    delete fakeTasks.records[id];
    return null;
  },

  async createStep(id: string, values: StepMutation) {
    const task = await fakeTasks.get(id);
    if (!task) {
      return null;
    }
    const step = {
      id: nanoid(),
      title: values.title || "",
      completed: values.completed || false,
    };
    const steps = [...task.steps, step];
    return fakeTasks.set(id, { steps });
  },

  async setStep(id: string, stepId: string, values: StepMutation) {
    const task = await fakeTasks.get(id);
    if (!task) {
      return null;
    }
    const stepIndex = task.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) {
      return null;
    }
    const steps = task.steps.slice();
    const step = { ...steps[stepIndex], ...values };
    steps[stepIndex] = step;
    return fakeTasks.set(id, { steps });
  },

  async deleteStep(id: string, stepId: string) {
    const task = await fakeTasks.get(id);
    if (!task) {
      return null;
    }
    const stepIndex = task.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) {
      return null;
    }
    if (stepIndex === 0) {
      return fakeTasks.set(id, { steps: task.steps.slice(1) });
    }
    return fakeTasks.set(id, {
      steps: task.steps
        .slice(0, stepIndex)
        .concat(task.steps.slice(stepIndex + 1)),
    });
  },
};

export const Filters = ["all", "today", "planned"] as const;
export function isValidFilter(type?: string): type is FilterType {
  return Filters.includes(type as FilterType);
}
export type FilterType = (typeof Filters)[number];
export async function getTasks(filterType: FilterType) {
  return fakeTasks.getAll().then((tasks) => {
    if (filterType === "today") {
      return tasks.filter((task) => {
        return task.isToday;
      });
    }
    if (filterType === "planned") {
      return tasks.filter((task) => {
        return task.dueDate;
      });
    }
    return tasks;
  });
}

export async function getTask(id: string) {
  return fakeTasks.get(id);
}

export async function createTask(values: TaskMutation) {
  if (!values.title) {
    return null;
  }
  return fakeTasks.create(values);
}

export async function updateTask(id: string, values: TaskMutation) {
  const task = await fakeTasks.get(id);
  if (!task) {
    return null;
  }
  return fakeTasks.set(id, { ...task, ...values });
}

export async function deleteTask(id: string) {
  return fakeTasks.delete(id);
}

async function refreshIsTodayTasks() {
  const toFalsePromises: Promise<Task | null>[] = [];
  (await getTasks("today")).forEach((task) => {
    toFalsePromises.push(updateTask(task.id, { isToday: false }));
  });

  const toTruePromises: Promise<Task | null>[] = [];
  (await getTasks("all")).forEach((task) => {
    if (task.dueDate && isToday(parseISO(task.dueDate))) {
      toTruePromises.push(updateTask(task.id, { isToday: true }));
    }
  });
  return {
    toFalseCount: (await Promise.all(toFalsePromises)).length,
    toTrueCount: (await Promise.all(toTruePromises)).length,
  };
}

export async function createStep(id: string, title: string) {
  return fakeTasks.createStep(id, {
    title: title,
  });
}

export async function updateStep(
  id: string,
  stepId: string,
  values: StepMutation
) {
  return fakeTasks.setStep(id, stepId, values);
}

export async function deleteStep(id: string, stepId: string) {
  return fakeTasks.deleteStep(id, stepId);
}

refreshIsTodayTasks().then(() => {
  const cronTaskList = cron.getTasks();
  for (let [key, value] of cronTaskList.entries()) {
    if (key === "refreshIsTodayTasks") {
      value.stop();
      console.log(`stop existing cron task: ${key}`);
    }
  }

  cron.schedule(
    "0 0 * * *",
    async () => {
      const result = await refreshIsTodayTasks();
      console.log(
        `refresh isToday task. to false: ${result.toFalseCount}, to true: ${result.toTrueCount}`
      );
    },
    {
      name: "refreshIsTodayTasks",
    }
  );

  [
    {
      title: "task タイトル1",
      isToday: false,
      steps: [
        {
          id: nanoid(),
          title: "step タイトル1",
          completed: false,
        },
        {
          id: nanoid(),
          title: "step タイトル2",
          completed: true,
        },
      ],
    },
    {
      title: "task タイトル2",
      isToday: true,
      repeat: {
        type: "weekly",
        dayOfTheWeeks: ["monday", "wednesday", "friday"],
      },
    },
    {
      title: "task タイトル3",
      isToday: false,
      dueDate: new Date().toISOString(),
    },
    {
      title: "task タイトル4",
      isToday: true,
      dueDate: new Date().toISOString(),
      memo: "memo",
      completed: true,
    },
    {
      title: "task タイトル5",
      isToday: true,
      repeat: {
        type: "weekly",
        dayOfTheWeeks: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      },
    },
    {
      title: "task タイトル6",
      isToday: true,
      repeat: {
        type: "weekly",
        dayOfTheWeeks: [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ],
      },
    },
    {
      title: "task タイトル7",
      isToday: true,
      repeat: {
        type: "monthly",
        days: [10],
      },
    },
  ].forEach((task) => {
    fakeTasks.create(task as TaskMutation);
  });
});

import { nanoid } from "nanoid";

type TaskMutation = {
  id?: string;
  title?: string;
  dueDate?: string;
  isToday?: boolean;
  completed?: boolean;
  memo?: string;
  steps?: Step[];
  repeat?: Repeat;
};

export type Task = TaskMutation & {
  id: string;
  title: string;
  isToday: boolean;
  completed: boolean;
  createdAt: string;
  memo: string;
  steps: Step[];
};

export type Repeat = Weekly | Monthly;
type Weekly = {
  type: "weekly";
  dayOfTheWeeks: DayOfTheWeek[];
};
type Monthly = {
  type: "monthly";
  days: number[];
};

export type DayOfTheWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export const EveryDay: DayOfTheWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
export const WeekDay: DayOfTheWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

export function isRepeatEveryday(repeat?: Repeat) {
  if (!repeat) {
    return false;
  }
  if (repeat.type === "monthly") {
    return false;
  }
  if (repeat.dayOfTheWeeks.length === 7) {
    return true;
  }
  return false;
}

export function isRepeatWeekday(repeat?: Repeat) {
  if (!repeat) {
    return false;
  }
  if (repeat.type === "monthly") {
    return false;
  }
  if (
    repeat.dayOfTheWeeks.length === 5 &&
    repeat.dayOfTheWeeks.includes("monday") &&
    repeat.dayOfTheWeeks.includes("tuesday") &&
    repeat.dayOfTheWeeks.includes("wednesday") &&
    repeat.dayOfTheWeeks.includes("thursday") &&
    repeat.dayOfTheWeeks.includes("friday")
  ) {
    return true;
  }
  return false;
}

export function japaneseDayOfTheWeek(day: DayOfTheWeek) {
  switch (day) {
    case "sunday":
      return "日曜日";
    case "monday":
      return "月曜日";
    case "tuesday":
      return "火曜日";
    case "wednesday":
      return "水曜日";
    case "thursday":
      return "木曜日";
    case "friday":
      return "金曜日";
    case "saturday":
      return "土曜日";
  }
}

export type StepMutation = {
  id?: string;
  title?: string;
  completed?: boolean;
};

export type Step = StepMutation & {
  id: string;
  title: string;
  completed: boolean;
};

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
    this.records[id] = {
      ...values,
      id,
      title,
      isToday,
      completed,
      createdAt,
      memo,
      steps,
    };
    return this.records[id];
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

export async function getTasks() {
  return fakeTasks.getAll();
}

export async function getTask(id: string) {
  return fakeTasks.get(id);
}

export async function createTask(title: string, isToday: boolean) {
  return fakeTasks.create({
    title: title,
    isToday: isToday,
  });
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
    isToday: true,
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

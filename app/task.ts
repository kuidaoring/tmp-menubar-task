import { Day } from "date-fns";

export type TaskMutation = {
  id?: string;
  title?: string;
  dueDate?: string;
  isToday?: boolean;
  completed?: boolean;
  memo?: string;
  steps?: Step[];
  repeat?: Repeat;
  repeatCreated?: boolean;
};

export type Task = TaskMutation & {
  id: string;
  title: string;
  isToday: boolean;
  completed: boolean;
  createdAt: string;
  memo: string;
  steps: Step[];
  repeatCreated: boolean;
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
] as const;

export const WeekDay: DayOfTheWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;

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

export const japaneseDayOfTheWeekMap: Record<DayOfTheWeek, string> = {
  sunday: "日曜日",
  monday: "月曜日",
  tuesday: "火曜日",
  wednesday: "水曜日",
  thursday: "木曜日",
  friday: "金曜日",
  saturday: "土曜日",
} as const;
export const dayNumberMap: Record<DayOfTheWeek, Day> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
} as const;

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

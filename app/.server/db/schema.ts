import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const taskTable = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  dueDate: text("dueDate"),
  isToday: integer("isToday", { mode: "boolean" }).notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull(),
  memo: text("memo").notNull(),
  repeatType: text("repeatType"),
  repeatDayOfTheWeeks: text("repeatDayOfTheWeeks"),
  repeatDays: text("repeatDays"),
  repeatCreated: integer("repeatCreated", { mode: "boolean" }).notNull(),
  createdAt: text("createdAt").notNull(),
});

export const tasksRelation = relations(taskTable, ({ many }) => {
  return {
    steps: many(stepTable),
  };
});

export type TaskEntity = typeof taskTable.$inferSelect;

export const stepTable = sqliteTable("steps", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull(),
  taskId: text("taskId").notNull(),
});

export const stepsRelation = relations(stepTable, ({ one }) => {
  return {
    task: one(taskTable, {
      fields: [stepTable.taskId],
      references: [taskTable.id],
    }),
  };
});

export const lastRefreshed = sqliteTable("lasttRefreshed", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
});

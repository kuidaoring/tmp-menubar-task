import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createTask, getTasks, isValidFilter, updateTask } from "../.server/db";
import { formatDate } from "../dateFormat";
import {
  Form,
  Link,
  useFetcher,
  useLoaderData,
  useNavigation,
  useParams,
} from "@remix-run/react";
import { useEffect, useRef } from "react";
import { Task, getRepeatLabel } from "~/task";
import { compareAsc, startOfToday } from "date-fns";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

type Group = { title?: string; tasks: Task[] };

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const filter = isValidFilter(params.filter) ? params.filter : "all";
  const tasks = await getTasks(filter);

  const taskGroups: Group[] = [];
  switch (filter) {
    case "planned":
      tasks
        .map((task) => {
          return {
            title: task.dueDate ? formatDate(task.dueDate) : "期限なし",
            task: task,
          };
        })
        .forEach((task) => {
          const group = taskGroups.find((group) => group.title === task.title);
          if (group) {
            group.tasks.push(task.task);
          } else {
            taskGroups.push({
              title: task.title,
              tasks: [task.task],
            });
          }
        });
      taskGroups.sort((a, b) => {
        if (!a.tasks[0].dueDate || !b.tasks[0].dueDate) {
          return 0;
        }
        return compareAsc(
          new Date(a.tasks[0].dueDate),
          new Date(b.tasks[0].dueDate)
        );
      });
      break;
    case "today":
    case "all":
    default:
      taskGroups.push({
        title: "未完了",
        tasks: tasks.filter((task) => !task.completed),
      });
      taskGroups.push({
        title: "✅ 完了済み",
        tasks: tasks.filter((task) => task.completed),
      });
      break;
  }
  return json({ taskGroups });
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  if (formData.get("type") === "create") {
    const title = formData.get("title") as string;
    const isToday = params.filter === "today";
    const dueDate =
      params.filter === "planned" ? startOfToday().toISOString() : undefined;
    const task = await createTask({ title, isToday, dueDate });
    return json({ task });
  }
  if (formData.get("type") === "toggleComplete") {
    const id = formData.get("id") as string;
    const completed = formData.get("completed") === "true";
    const task = await updateTask(id, { completed });
    return json({ task });
  }
  if (formData.get("type") === "toggleIsToday") {
    const id = formData.get("id") as string;
    const isToday = formData.get("isToday") === "true";
    const task = await updateTask(id, { isToday });
    return json({ task });
  }
};

export default function List() {
  const { taskGroups } = useLoaderData<typeof loader>();
  const params = useParams();
  const isAllPage = params.filter !== "today";
  const navigation = useNavigation();
  const isAdding =
    navigation.state === "submitting" &&
    navigation.formData?.get("type") === "create";
  const createFormRef = useRef<HTMLFormElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAdding) {
      createFormRef.current?.reset();
      createInputRef.current?.focus();
    }
  }, [isAdding]);

  return (
    <>
      <Form method="post" ref={createFormRef}>
        <div className="flex flex-row border-b">
          <input
            type="text"
            name="title"
            className="w-full bg-transparent border-none focus:ring-0 text-sm"
            placeholder="タスクを追加"
            ref={createInputRef}
          />
          <input type="hidden" name="type" value="create" />
          <button type="submit" className="border-l w-10">
            ➕
          </button>
        </div>
      </Form>
      {taskGroups.length === 0 ? (
        <p className="text-center m-10">
          {!isAllPage ? "今日の" : ""}タスクがありません
        </p>
      ) : null}
      {taskGroups.map((group) => {
        return (
          <>
            {group.title ? (
              <h2 className="p-2 border-b">{group.title}</h2>
            ) : null}
            <TaskList tasks={group.tasks} isAllPage={isAllPage} />
          </>
        );
      })}
    </>
  );
}

type TaskListProps = {
  tasks: Task[];
  isAllPage: boolean;
};

function TaskList({ tasks, isAllPage }: TaskListProps) {
  const fetcher = useFetcher();
  return (
    <ul className="divide-y">
      {tasks.map((task) => {
        const completed =
          fetcher.formData && fetcher.formData.get("id") === task.id
            ? fetcher.formData.get("completed") === "true"
            : task.completed;
        const isToday =
          fetcher.formData && fetcher.formData.get("id") === task.id
            ? fetcher.formData.get("isToday") === "true"
            : task.isToday;
        return (
          <li className="flex flex-row py-1" key={task.id}>
            <div className="flex-none w-10 flex justify-center">
              <fetcher.Form
                method="post"
                onChange={(event) => fetcher.submit(event.currentTarget)}
                className="self-center"
              >
                <input
                  type="checkbox"
                  className="rounded"
                  name="completed"
                  value="true"
                  defaultChecked={completed}
                />
                <input type="hidden" name="type" value="toggleComplete" />
                <input type="hidden" name="id" value={task.id} />
              </fetcher.Form>
            </div>
            <Link className="flex-grow" to={`/tasks/${task.id}`}>
              <div className="flex-glow">
                <p
                  className={`${
                    task.completed ? "line-through text-gray-400" : ""
                  }`}
                >
                  {task.title}
                </p>
                <p className="divide-x text-xs">
                  {task.dueDate ? (
                    <span className="text-center px-1">
                      🗓 {formatDate(task.dueDate)}
                    </span>
                  ) : null}
                  {task.steps.length > 0 ? (
                    <span className="text-center px-1">
                      🎮 {task.steps.filter((s) => s.completed).length}/
                      {task.steps.length}
                    </span>
                  ) : null}
                  {task.memo ? (
                    <span className="text-center px-1">📝 メモ</span>
                  ) : null}
                  {task.repeat ? (
                    <span className="text-center px-1">
                      🔄{" "}
                      {((t) => {
                        const label = getRepeatLabel(t.repeat);
                        return label
                          ? `${label.main}${label.sub ? `(${label.sub})` : ""}`
                          : null;
                      })(task)}
                    </span>
                  ) : null}
                </p>
              </div>
            </Link>
            {isAllPage ? (
              <fetcher.Form
                method="post"
                onChange={(event) => fetcher.submit(event.currentTarget)}
                className="w-10 text-xs self-center text-center"
              >
                <label
                  title="今日の予定に設定"
                  className="contrast-0 has-[:checked]:contrast-100"
                >
                  🚀
                  <input
                    type="checkbox"
                    className="hidden"
                    name="isToday"
                    value="true"
                    defaultChecked={isToday}
                  />
                  <input type="hidden" name="type" value="toggleIsToday" />
                  <input type="hidden" name="id" value={task.id} />
                </label>
              </fetcher.Form>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

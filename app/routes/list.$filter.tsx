import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createTask, getTasks, updateTask } from "../data";
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

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const tasks = await getTasks();
  if (params.filter === "today") {
    return json({ tasks: tasks.filter((task) => task.isToday) });
  }
  return json({ tasks });
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  if (formData.get("type") === "create") {
    const isToday = params.filter === "today";
    const task = await createTask(formData.get("title") as string, isToday);
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
  const { tasks } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
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
      {tasks.length === 0 ? (
        <p className="text-center m-10">
          {!isAllPage ? "今日の" : ""}タスクがありません
        </p>
      ) : (
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
                        <span className="text-center px-1">🔄</span>
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
      )}
    </>
  );
}

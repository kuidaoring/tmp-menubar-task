import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  createStep,
  deleteStep,
  getTask,
  updateStep,
  updateTask,
} from "../.server/db";
import {
  EveryDay,
  Repeat,
  WeekDay,
  getRepeatLabel,
  isRepeatEveryday,
  isRepeatWeekday,
} from "~/task";
import {
  Form,
  useFetcher,
  useLoaderData,
  useNavigate,
  useNavigation,
  useParams,
} from "@remix-run/react";
import { useEffect, useRef, useState } from "react";

import ReactDatePicker from "react-datepicker";
const DatePicker =
  (ReactDatePicker as unknown as { default: typeof ReactDatePicker }).default ??
  ReactDatePicker;
import "react-datepicker/dist/react-datepicker.css";
import { formatDate, getFormat } from "~/dateFormat";
import { ja } from "date-fns/locale";
import { startOfToday, subBusinessDays } from "date-fns";
import RepeatDialog, { RepeatDialogHandle } from "~/components/RepeatDialog";

type UpdatedStepTitleInfo = {
  title: string;
  stepId: string;
};

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  if (!params.id) {
    throw new Response("Not Found", { status: 404 });
  }
  const task = await getTask(params.id);
  if (!task) {
    throw new Response("Not Found", { status: 404 });
  }
  return json({ task });
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
  if (!params.id) {
    throw new Response("Not Found", { status: 404 });
  }
  const formData = await request.formData();
  const id = params.id;
  if (formData.get("type") === "toggleComplete") {
    const completed = formData.get("completed") === "true";
    const task = await updateTask(id, { completed });
    return json({ task });
  }
  if (formData.get("type") === "toggleIsToday") {
    const isToday = formData.get("isToday") === "true";
    const task = await updateTask(id, { isToday });
    return json({ task });
  }
  if (formData.get("type") === "updateTitle") {
    const title = formData.get("title") as string;
    const task = await updateTask(id, { title });
    return json({ task });
  }
  if (formData.get("type") === "updateMemo") {
    const memo = formData.get("memo") as string;
    const task = await updateTask(id, { memo });
    return json({ task });
  }
  if (formData.get("type") === "updateDueDate") {
    const dueDate = formData.get("dueDate") as string;
    const task = await updateTask(id, { dueDate });
    return json({ task });
  }
  if (formData.get("type") === "updateRepeat") {
    const repeat = formData.get("repeat") as string;
    if (repeat === "none") {
      const task = await updateTask(id, { repeat: undefined });
      return json({ task });
    }
    if (repeat === "everyday") {
      const task = await updateTask(id, {
        repeat: { type: "weekly", dayOfTheWeeks: EveryDay },
      });
      return json({ task });
    }
    if (repeat === "weekday") {
      const task = await updateTask(id, {
        repeat: { type: "weekly", dayOfTheWeeks: WeekDay },
      });
      return json({ task });
    }
    if (repeat === "everyweek") {
      const checkedDay = EveryDay.filter((day) => {
        return formData.get(`everyweek-${day}`) === "true";
      });
      const task = await updateTask(id, {
        repeat: { type: "weekly", dayOfTheWeeks: checkedDay },
      });
      return json({ task });
    }
    if (repeat === "everymonth") {
      const task = await updateTask(id, {
        repeat: {
          type: "monthly",
          days: [parseInt(formData.get("everymonth-day") as string)],
        },
      });
      return json({ task });
    }
  }
  if (formData.get("type") === "toggleCompletedStep") {
    const stepId = formData.get("stepId") as string;
    const completed = formData.get("completed") === "true";
    const task = updateStep(id, stepId, { completed });
    return json({ task });
  }
  if (formData.get("type") === "addStep") {
    const title = formData.get("title") as string;
    const task = createStep(id, title);
    return json({ task });
  }
  if (formData.get("type") === "updateStepTitle") {
    const title = formData.get("title") as string;
    const stepId = formData.get("stepId") as string;
    const task = updateStep(id, stepId, { title });
    return json({ task });
  }
  if (formData.get("type") === "deleteStep") {
    const stepId = formData.get("stepId") as string;
    const task = deleteStep(id, stepId);
    return json({ task });
  }
};

export default function TaskPage() {
  const params = useParams();
  return <Task key={params.id} />;
}

function Task() {
  const { task } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const completed = fetcher.formData
    ? fetcher.formData.get("completed") === "true"
    : task.completed;
  const isToday = fetcher.formData
    ? fetcher.formData.get("isToday") === "true"
    : task.isToday;
  const navigate = useNavigate();

  const navigation = useNavigation();
  const isAddingStep =
    navigation.state === "submitting" &&
    navigation.formData?.get("type") === "addStep";
  const addStepFormRef = useRef<HTMLFormElement>(null);
  const addStepinputRef = useRef<HTMLInputElement>(null);
  const [isFirstUpdateStep, setIsFirstUpdateStep] = useState(true);
  useEffect(() => {
    if (!isAddingStep) {
      if (isFirstUpdateStep) {
        setIsFirstUpdateStep(false);
        return;
      }
      addStepFormRef.current?.reset();
      addStepinputRef.current?.focus();
    }
  }, [isAddingStep]);

  const delay = 500;
  const [updatedTitle, setUpdatedTitle] = useState(task.title);
  const [isFirstUpdateTitle, setIsFirstUpdateTitle] = useState(true);
  useEffect(() => {
    if (isFirstUpdateTitle) {
      setIsFirstUpdateTitle(false);
      return;
    }
    const timer = setTimeout(() => {
      fetcher.submit(
        { title: updatedTitle, type: "updateTitle" },
        { method: "post", action: `/tasks/${task.id}` }
      );
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [updatedTitle]);

  const [updatedMemo, setUpdatedMemo] = useState(task.memo);
  const [isFirstUpdateMemo, setIsFirstUpdateMemo] = useState(true);
  useEffect(() => {
    if (isFirstUpdateMemo) {
      setIsFirstUpdateMemo(false);
      return;
    }
    const timer = setTimeout(() => {
      fetcher.submit(
        { memo: updatedMemo, type: "updateMemo" },
        { method: "post", action: `/tasks/${task.id}` }
      );
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [updatedMemo]);

  const [updatedStepTitleInfo, setUpdatedStepTitleInfo] =
    useState<UpdatedStepTitleInfo | null>(null);
  const [isFirstUpdateStepTitle, setIsFirstUpdateStepTitle] = useState(true);
  useEffect(() => {
    if (isFirstUpdateStepTitle) {
      setIsFirstUpdateStepTitle(false);
      return;
    }
    if (!updatedStepTitleInfo) {
      return;
    }
    const timer = setTimeout(() => {
      fetcher.submit(
        {
          title: updatedStepTitleInfo.title,
          type: "updateStepTitle",
          stepId: updatedStepTitleInfo.stepId,
        },
        {
          method: "post",
          action: `/tasks/${task.id}`,
        }
      );
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [updatedStepTitleInfo]);

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const datePickerRef = useRef<ReactDatePicker | null>(null);

  const repeatDialogRef = useRef<RepeatDialogHandle>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  return (
    <div className="divide-y flex flex-col h-screen">
      <div className="flex flex-row py-1">
        <button
          onClick={() => navigate(-1)}
          className="flex-none w-10 flex justify-center self-center"
        >
          ↩️
        </button>
      </div>
      <div className="flex flex-row py-1">
        <div className="flex-none w-10 flex justify-center">
          <fetcher.Form
            method="post"
            action={`/tasks/${task.id}`}
            onChange={(event) => fetcher.submit(event.currentTarget)}
            className="self-center"
          >
            <input
              type="checkbox"
              name="completed"
              className="rounded"
              value="true"
              defaultChecked={completed}
            />
            <input type="hidden" name="type" value="toggleComplete" />
          </fetcher.Form>
        </div>
        <input
          type="text"
          className={`p-1 pl-0 mr-1 w-full bg-transparent border-none fucus:ring-0 text-sm${
            task.completed ? " line-through text-gray-400" : ""
          }`}
          defaultValue={task.title}
          onChange={(event) => setUpdatedTitle(event.currentTarget.value)}
        />
      </div>
      <div className="divide-y flex-1 overflow-y-scroll">
        <div className="py-1">
          <div className="flex flex-row">
            <p className="flex-none w-10 flex justify-center self-center">🎮</p>
            <ul className="grow">
              {task.steps.map((step) => {
                return (
                  <li className="flex flex-row py-0.5" key={step.id}>
                    <div className="flex-none w-5 flex justify-center">
                      <fetcher.Form
                        method="post"
                        action={`/tasks/${task.id}`}
                        onChange={(event) =>
                          fetcher.submit(event.currentTarget)
                        }
                        className="self-center"
                      >
                        <input
                          type="checkbox"
                          name="completed"
                          value="true"
                          className="rounded"
                          defaultChecked={step.completed}
                        />
                        <input
                          type="hidden"
                          name="type"
                          value="toggleCompletedStep"
                        />
                        <input type="hidden" name="stepId" value={step.id} />
                      </fetcher.Form>
                    </div>
                    <fetcher.Form
                      method="post"
                      action={`/tasks/${task.id}`}
                      className="grow mr-1"
                    >
                      <input
                        type="text"
                        name="title"
                        className={`p-1 w-full bg-transparent border-none fucus:ring-0 text-sm${
                          step.completed ? " line-through text-gray-400" : ""
                        }`}
                        defaultValue={step.title}
                        onChange={(event) =>
                          setUpdatedStepTitleInfo({
                            title: event.currentTarget.value,
                            stepId: step.id,
                          })
                        }
                      />
                      <input
                        type="hidden"
                        name="type"
                        value="updateStepTitle"
                      />
                      <input type="hidden" name="stepId" value={step.id} />
                    </fetcher.Form>
                    <fetcher.Form
                      method="post"
                      action={`/tasks/${task.id}`}
                      className="w-10 self-center text-center"
                    >
                      <button>🗑</button>
                      <input type="hidden" name="type" value="deleteStep" />
                      <input type="hidden" name="stepId" value={step.id} />
                    </fetcher.Form>
                  </li>
                );
              })}
              <li className="flex flex-row py-0.5">
                <div className="flex-none w-5 flex justify-center">
                  <p className="self-center">➕</p>
                </div>
                <Form
                  method="post"
                  action={`/tasks/${task.id}`}
                  ref={addStepFormRef}
                  className="grow mr-1"
                >
                  <input
                    type="text"
                    name="title"
                    className="p-1 w-full bg-transparent border-none fucus:ring-0 text-sm placeholder-gray-400"
                    placeholder="ステップを追加"
                    ref={addStepinputRef}
                  />
                  <input type="hidden" name="type" value="addStep" />
                </Form>
              </li>
            </ul>
          </div>
        </div>
        <div className="py-1">
          <div className="flex flex-row">
            <p className="flex-none w-10 flex justify-center self-center">🚀</p>
            <fetcher.Form
              method="post"
              action={`/tasks/${task.id}`}
              onChange={(event) => fetcher.submit(event.currentTarget)}
            >
              <button className={`self-center ${!isToday && "text-gray-400"}`}>
                {isToday ? "今日の予定" : "今日の予定に追加"}
              </button>
              <input type="hidden" name="type" value="toggleIsToday" />
              <input
                type="hidden"
                name="isToday"
                value={isToday ? "false" : "true"}
              />
            </fetcher.Form>
          </div>
        </div>
        <div className="py-1">
          <div className="flex flex-row">
            <p className="flex-none w-10 flex justify-center self-center">🗓</p>
            <DatePicker
              onChange={(date) => submitDueDate(fetcher, date, task.id)}
              selected={dueDate}
              placeholderText="期限を設定"
              isClearable
              locale={ja}
              dateFormat={getFormat(dueDate)}
              className="p-1 pl-0 grow w-full bg-transparent border-none focus:ring-0 text-sm placeholder-gray-400"
              ref={datePickerRef}
            >
              <button
                className="mr-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
                onClick={() => {
                  submitDueDate(fetcher, startOfToday(), task.id);
                  datePickerRef.current?.setOpen(false);
                }}
              >
                今日
              </button>
              <button
                className="mr-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
                onClick={() => {
                  submitDueDate(
                    fetcher,
                    subBusinessDays(startOfToday(), -1),
                    task.id
                  );
                  datePickerRef.current?.setOpen(false);
                }}
              >
                翌営業日
              </button>
            </DatePicker>
          </div>
        </div>
        <div className="py-1">
          <div className="flex flex-row">
            <p className="flex-none w-10 flex justify-center self-center">🔄</p>
            <button
              onClick={() => repeatDialogRef.current?.showModal()}
              className={`text-left ${!task.repeat ? "text-gray-400" : ""}`}
            >
              <RepeatLabel repeat={task.repeat} />
            </button>
            <fetcher.Form
              method="post"
              action={`/tasks/${task.id}`}
              onSubmit={(event) => {
                fetcher.submit(event.currentTarget);
                repeatDialogRef.current?.close();
              }}
            >
              <RepeatDialog task={task} ref={repeatDialogRef} />
            </fetcher.Form>
          </div>
        </div>
        <div className="py-1">
          <div className="flex flex-row">
            <p className="flex-none w-10 flex justify-center self-center">📝</p>
            <textarea
              className="self-center w-full mr-1 my-1 border-gray-300 text-sm focus:ring-0"
              placeholder="メモ"
              onChange={(event) => setUpdatedMemo(event.currentTarget.value)}
              defaultValue={task.memo}
            />
          </div>
        </div>
      </div>
      <div className="py-1">
        <div className="flex flex-row">
          <p className="flex-none w-10 flex justify-center self-center">ℹ</p>
          <p className="flex-1 text-gray-400">
            作成日: {formatDate(task.createdAt)}
          </p>
          <button
            className="w-10 self-center text-center"
            onClick={() => deleteDialogRef.current?.showModal()}
          >
            🗑
          </button>
          <dialog
            ref={deleteDialogRef}
            onClick={(event) => {
              if (event.target === deleteDialogRef.current) {
                deleteDialogRef.current?.close();
              }
            }}
            className="p-2 bg-white border-2 border-gray-300 rounded-md text-center"
          >
            <div>
              <p className="my-5">🗑</p>
              <p className="my-5">タスクを削除しますか?</p>
              <div className="flex justify-center">
                <Form method="post" action={`/tasks/${task.id}/destroy`}>
                  <button
                    type="submit"
                    className="mx-2 px-2 py-1 bg-red-500 hover:bg-red-800 text-white rounded-md"
                  >
                    削除
                  </button>
                </Form>
                <button
                  type="button"
                  onClick={() => deleteDialogRef.current?.close()}
                  className="mx-2 px-2 py-1 bg-white border border-gray-200 hover:bg-gray-100 rounded-md"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </dialog>
        </div>
      </div>
    </div>
  );
}

function submitDueDate(
  fetcher: ReturnType<typeof useFetcher>,
  dueDate: Date | null,
  id: string
) {
  fetcher.submit(
    {
      dueDate: dueDate?.toISOString() ?? "",
      type: "updateDueDate",
    },
    { method: "post", action: `/tasks/${id}` }
  );
}

function RepeatLabel({ repeat }: { repeat?: Repeat }) {
  const label = getRepeatLabel(repeat);
  if (!label) {
    return "繰り返しを設定";
  }
  return (
    <>
      {label.main}
      <div className="text-xs text-gray-400">{label.sub}</div>
    </>
  );
}

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
  isRepeatEveryday,
  isRepeatWeekday,
  japaneseDayOfTheWeekMap,
} from "~/task";
import {
  Form,
  useFetcher,
  useLoaderData,
  useNavigate,
  useNavigation,
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

export default function Task() {
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

  const repeatDialogRef = useRef<HTMLDialogElement>(null);
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
                    className="p-1 w-full bg-transparent border-none fucus:ring-0 text-sm"
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
              className="p-1 pl-0 grow w-full bg-transparent border-none focus:ring-0 text-sm"
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
              {getRepeatLabel(task.repeat)}
            </button>
            <dialog
              ref={repeatDialogRef}
              onClick={(event) => {
                if (event.target === repeatDialogRef.current) {
                  repeatDialogRef.current?.close();
                }
              }}
              className="p-2 w-[60vh] bg-white border-2 border-gray-300 rounded-md text-center"
            >
              <fetcher.Form
                method="post"
                action={`/tasks/${task.id}`}
                onSubmit={(event) => {
                  fetcher.submit(event.currentTarget);
                  repeatDialogRef.current?.close();
                }}
              >
                <input type="hidden" name="type" value="updateRepeat" />
                <div>
                  <p className="my-5">🔄</p>
                  <p className="my-5">繰り返し</p>
                  <ul className="text-left mx-2 mb-2">
                    <li className="my-1">
                      <input
                        type="radio"
                        name="repeat"
                        value="everyday"
                        id="repeat-everyday"
                        defaultChecked={isRepeatEveryday(task.repeat)}
                      />
                      <label htmlFor="repeat-everyday" className="py-3 ms-2">
                        毎日
                      </label>
                    </li>
                    <li className="my-1">
                      <input
                        type="radio"
                        name="repeat"
                        value="weekday"
                        id="repeat-weekday"
                        defaultChecked={isRepeatWeekday(task.repeat)}
                      />
                      <label htmlFor="repeat-weekday" className="py-3 ms-2">
                        平日
                      </label>
                    </li>
                    <li className="my-1">
                      <input
                        type="radio"
                        name="repeat"
                        value="everyweek"
                        id="repeat-everyweek"
                        className="peer"
                        defaultChecked={
                          task.repeat?.type === "weekly" &&
                          !isRepeatEveryday(task.repeat) &&
                          !isRepeatWeekday(task.repeat)
                        }
                      />
                      <label htmlFor="repeat-everyweek" className="py-3 ms-2">
                        毎週
                      </label>
                      <div className="hidden peer-checked:block w-fit overflow-hidden mt-1 mb-2 ml-5 rounded-md border border-gray-300 divide-x">
                        {[
                          {
                            label: "日",
                            value: "sunday",
                            checked:
                              task.repeat?.type === "weekly" &&
                              task.repeat?.dayOfTheWeeks.includes("sunday"),
                          },
                          {
                            label: "月",
                            value: "monday",
                            checked:
                              task.repeat?.type === "weekly" &&
                              task.repeat?.dayOfTheWeeks.includes("monday"),
                          },
                          {
                            label: "火",
                            value: "tuesday",
                            checked:
                              task.repeat?.type === "weekly" &&
                              task.repeat?.dayOfTheWeeks.includes("tuesday"),
                          },
                          {
                            label: "水",
                            value: "wednesday",
                            checked:
                              task.repeat?.type === "weekly" &&
                              task.repeat?.dayOfTheWeeks.includes("wednesday"),
                          },
                          {
                            label: "木",
                            value: "thursday",
                            checked:
                              task.repeat?.type === "weekly" &&
                              task.repeat?.dayOfTheWeeks.includes("thursday"),
                          },
                          {
                            label: "金",
                            value: "friday",
                            checked:
                              task.repeat?.type === "weekly" &&
                              task.repeat?.dayOfTheWeeks.includes("friday"),
                          },
                          {
                            label: "土",
                            value: "saturday",
                            checked:
                              task.repeat?.type === "weekly" &&
                              task.repeat?.dayOfTheWeeks.includes("saturday"),
                          },
                        ].map((day) => {
                          return (
                            <label
                              htmlFor={`repeat-${day.value}`}
                              className="inline-block p-1 has-[:checked]:bg-blue-500 has-[:checked]:text-white"
                              key={`repeat-${day.value}`}
                            >
                              {day.label}
                              <input
                                type="checkbox"
                                id={`repeat-${day.value}`}
                                name={`everyweek-${day.value}`}
                                value="true"
                                className="hidden"
                                defaultChecked={day.checked}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </li>
                    <li className="my-1">
                      <input
                        type="radio"
                        name="repeat"
                        value="everymonth"
                        id="repeat-everymonth"
                        className="peer"
                        defaultChecked={task.repeat?.type === "monthly"}
                      />
                      <label htmlFor="repeat-everymonth" className="py-3 ms-2">
                        毎月
                      </label>
                      <div className="hidden peer-checked:block mt-1 mb-2 ml-5">
                        <select
                          name="everymonth-day"
                          className="rounded py-1"
                          defaultValue={
                            task.repeat?.type === "monthly"
                              ? task.repeat?.days[0]
                              : undefined
                          }
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(
                            (day) => {
                              return (
                                <option key={day} value={day}>
                                  {day}日
                                </option>
                              );
                            }
                          )}
                        </select>
                      </div>
                    </li>
                    <li className="my-1">
                      <input
                        type="radio"
                        name="repeat"
                        value="none"
                        id="repeat-none"
                      />
                      <label htmlFor="repeat-none" className="py-3 ms-2">
                        なし
                      </label>
                    </li>
                  </ul>
                  <div className="flex justify-center">
                    <button className="mx-2 px-2 py-1 bg-blue-500 hover:bg-blue-800 text-white rounded-md">
                      設定
                    </button>
                    <button
                      onClick={() => repeatDialogRef.current?.close()}
                      className="mx-2 px-2 py-1 bg-white border border-gray-200 hover:bg-gray-100 rounded-md"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              </fetcher.Form>
            </dialog>
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

function getRepeatLabel(repeat?: Repeat) {
  if (!repeat) {
    return "繰り返しを設定";
  }
  if (repeat.type === "monthly") {
    return (
      <>
        毎月
        <div className="text-xs text-gray-400">
          {repeat.days.map((d) => `${d}日`).join(",")}
        </div>
      </>
    );
  }
  if (isRepeatEveryday(repeat)) {
    return "毎日";
  }
  if (isRepeatWeekday(repeat)) {
    return "平日";
  }
  return (
    <>
      毎週
      <div className="text-xs text-gray-400">
        {repeat.dayOfTheWeeks.map((d) => japaneseDayOfTheWeekMap[d]).join(",")}
      </div>
    </>
  );
}

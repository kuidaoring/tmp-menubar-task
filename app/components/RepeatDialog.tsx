import { forwardRef, useImperativeHandle, useRef } from "react";
import { Task, isRepeatEveryday, isRepeatWeekday } from "~/task";

export type RepeatDialogHandle = {
  showModal: () => void;
  close: () => void;
};

type Props = {
  task?: Task;
  submitType?: "submit" | "button";
  onClick?: (
    event: React.FormEvent<HTMLButtonElement>,
    checked: RadioValue
  ) => void;
};

export type RadioValue =
  | "everyday"
  | "weekday"
  | "everyweek"
  | "everymonth"
  | "none";

const RepeatDialog = forwardRef<RepeatDialogHandle, Props>(
  function RepeatDialog({ task, submitType = "submit", onClick }, ref) {
    const repeatDialogRef = useRef<HTMLDialogElement>(null);
    const defaultChecked = task ? getSelectedRadioValue(task) : "none";
    const everydayRef = useRef<HTMLInputElement>(null);
    const weekdayRef = useRef<HTMLInputElement>(null);
    const everyweekRef = useRef<HTMLInputElement>(null);
    const everymonthRef = useRef<HTMLInputElement>(null);
    const noneRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(
      ref,
      () => {
        return {
          showModal() {
            repeatDialogRef.current?.showModal();
          },
          close() {
            repeatDialogRef.current?.close();
          },
        };
      },
      []
    );

    return (
      <dialog
        ref={repeatDialogRef}
        onClick={(event) => {
          if (event.target === repeatDialogRef.current) {
            repeatDialogRef.current?.close();
          }
        }}
        className="p-2 w-[60vh] bg-white border-2 border-gray-300 rounded-md text-center"
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
                defaultChecked={defaultChecked === "everyday"}
                ref={everydayRef}
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
                defaultChecked={defaultChecked === "weekday"}
                ref={weekdayRef}
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
                defaultChecked={defaultChecked === "everyweek"}
                ref={everyweekRef}
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
                      task?.repeat?.type === "weekly" &&
                      task?.repeat?.dayOfTheWeeks.includes("sunday"),
                  },
                  {
                    label: "月",
                    value: "monday",
                    checked:
                      task?.repeat?.type === "weekly" &&
                      task?.repeat?.dayOfTheWeeks.includes("monday"),
                  },
                  {
                    label: "火",
                    value: "tuesday",
                    checked:
                      task?.repeat?.type === "weekly" &&
                      task?.repeat?.dayOfTheWeeks.includes("tuesday"),
                  },
                  {
                    label: "水",
                    value: "wednesday",
                    checked:
                      task?.repeat?.type === "weekly" &&
                      task?.repeat?.dayOfTheWeeks.includes("wednesday"),
                  },
                  {
                    label: "木",
                    value: "thursday",
                    checked:
                      task?.repeat?.type === "weekly" &&
                      task?.repeat?.dayOfTheWeeks.includes("thursday"),
                  },
                  {
                    label: "金",
                    value: "friday",
                    checked:
                      task?.repeat?.type === "weekly" &&
                      task?.repeat?.dayOfTheWeeks.includes("friday"),
                  },
                  {
                    label: "土",
                    value: "saturday",
                    checked:
                      task?.repeat?.type === "weekly" &&
                      task?.repeat?.dayOfTheWeeks.includes("saturday"),
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
                defaultChecked={defaultChecked === "everymonth"}
                ref={everymonthRef}
              />
              <label htmlFor="repeat-everymonth" className="py-3 ms-2">
                毎月
              </label>
              <div className="hidden peer-checked:block mt-1 mb-2 ml-5">
                <select
                  name="everymonth-day"
                  className="rounded py-1"
                  defaultValue={
                    task?.repeat?.type === "monthly"
                      ? task?.repeat?.days[0]
                      : undefined
                  }
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    return (
                      <option key={day} value={day}>
                        {day}日
                      </option>
                    );
                  })}
                </select>
              </div>
            </li>
            <li className="my-1">
              <input
                type="radio"
                name="repeat"
                value="none"
                id="repeat-none"
                defaultChecked={defaultChecked === "none"}
                ref={noneRef}
              />
              <label htmlFor="repeat-none" className="py-3 ms-2">
                なし
              </label>
            </li>
          </ul>
          <div className="flex justify-center">
            <button
              className="mx-2 px-2 py-1 bg-blue-500 hover:bg-blue-800 text-white rounded-md"
              type={submitType}
              onClick={(event) => {
                if (!onClick) {
                  return;
                }
                let checked: RadioValue = "none";
                if (everydayRef.current?.checked) {
                  checked = "everyday";
                } else if (weekdayRef.current?.checked) {
                  checked = "weekday";
                } else if (everyweekRef.current?.checked) {
                  checked = "everyweek";
                } else if (everymonthRef.current?.checked) {
                  checked = "everymonth";
                } else if (noneRef.current?.checked) {
                  checked = "none";
                }
                onClick(event, checked);
              }}
            >
              設定
            </button>
            <button
              onClick={() => repeatDialogRef.current?.close()}
              className="mx-2 px-2 py-1 bg-white border border-gray-200 hover:bg-gray-100 rounded-md"
              type="button"
            >
              閉じる
            </button>
          </div>
        </div>
      </dialog>
    );
  }
);
export default RepeatDialog;

function getSelectedRadioValue(task?: Task): RadioValue {
  if (isRepeatEveryday(task?.repeat)) {
    return "everyday";
  }
  if (isRepeatWeekday(task?.repeat)) {
    return "weekday";
  }
  if (
    task?.repeat?.type === "weekly" &&
    !isRepeatEveryday(task?.repeat) &&
    !isRepeatWeekday(task?.repeat)
  ) {
    return "everyweek";
  }
  if (task?.repeat?.type === "monthly") {
    return "everymonth";
  }
  return "none";
}

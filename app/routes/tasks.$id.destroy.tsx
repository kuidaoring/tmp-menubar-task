import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { deleteTask } from "~/data";

export const action = async ({ params }: ActionFunctionArgs) => {
  if (!params.id) {
    throw new Response("Not Found", { status: 404 });
  }
  await deleteTask(params.id);
  return redirect("/list/all");
};

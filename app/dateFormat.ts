import { format, isThisYear, isToday, isTomorrow, isYesterday } from "date-fns";
import { ja } from "date-fns/locale";

export function formatDate(date: string | null) {
  if (!date) {
    return "";
  }
  const d = new Date(date);
  return format(d, getFormat(d), { locale: ja });
}

export function getFormat(date: Date | null) {
  if (!date) {
    return "";
  }
  const d = new Date(date);
  if (isToday(d)) {
    return "今日";
  }
  if (isYesterday(d)) {
    return "昨日";
  }
  if (isTomorrow(d)) {
    return "明日";
  }
  if (isThisYear(d)) {
    return "M月d日(E)";
  }
  return "y年M月d日(E)";
}

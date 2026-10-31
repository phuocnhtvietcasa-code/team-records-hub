import { useRef, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { formatMoneyInput, parseMoneyInput } from "@/lib/finance";

export function MoneyInput({ value, onValueChange, ...props }: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & { value: number; onValueChange: (value: number) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return <Input {...props} ref={input} type="text" inputMode="numeric" autoComplete="off" value={formatMoneyInput(value)} onChange={(e) => {
    const position = e.target.selectionStart ?? e.target.value.length;
    const digitsBefore = e.target.value.slice(0, position).replace(/\D/g, "").length;
    const formatted = formatMoneyInput(e.target.value);
    onValueChange(parseMoneyInput(formatted));
    requestAnimationFrame(() => {
      const el = input.current;
      if (!el) return;
      let caret = 0;
      let count = 0;
      while (caret < el.value.length && count < digitsBefore) {
        if (/\d/.test(el.value.charAt(caret))) count++;
        caret++;
      }
      el.setSelectionRange(caret, caret);
    });
  }} />;
}
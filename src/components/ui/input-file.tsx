import { useId, useState, type ComponentProps } from "react";
import { CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface InputFileProps extends Omit<ComponentProps<"input">, "type"> {
  label?: string;
  placeholder?: string;
}

// react-hook-form registers this through `register("file")`, which hands us a
// ref and an onChange. We keep the native input as the single source of truth
// and only mirror the chosen file name for display.
//
// `id` is optional here because `FormControl` (a Radix Slot) clones its child
// and injects `id`, `aria-invalid` and `aria-describedby` derived from
// react-hook-form's field state. When an `id` is passed in, it is the id the
// form already committed to (and the id the FormLabel's `htmlFor` points at),
// so it — and the rest of the injected props — must land on the inner
// `<input>`, not be dropped on this component's outer wrapper.
export default function InputFile({
  id,
  label = "Comprovante",
  placeholder = "Nome do arquivo.pdf",
  className,
  onChange,
  ...props
}: InputFileProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="flex w-full flex-col gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="file"
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
            "file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-sm file:font-medium",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            className,
          )}
          onChange={(event) => {
            setFileName(event.target.files?.[0]?.name ?? null);
            onChange?.(event);
          }}
          {...props}
        />
        <CloudUpload className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-xs text-muted-foreground">{fileName ?? placeholder}</p>
    </div>
  );
}

import { useId, useState, type ComponentProps } from "react";
import { CloudUpload } from "lucide-react";
import { useTranslation } from "react-i18next";
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
//
// WHY THE NATIVE CONTROL IS HIDDEN RATHER THAN STYLED. A file input renders
// its own "Choose File / No file chosen" text, from the BROWSER's locale, and
// that text is reachable from neither CSS nor JavaScript — `::file-selector-button`
// styles the button but cannot retitle it, and nothing addresses the text
// beside it. So a Portuguese interface showed English there, permanently. The
// only fix is to replace the control: the real input stays in the page and
// keeps every accessibility property, and a <label> pointing at it provides
// the visible surface, whose text we own and therefore can translate.
//
// The input is sr-only, NOT display:none — hidden that way it would leave the
// accessibility tree and stop being focusable.
export default function InputFile({
  id,
  label = "Comprovante",
  placeholder = "Nome do arquivo.pdf",
  className,
  onChange,
  "aria-invalid": ariaInvalid,
  ...props
}: InputFileProps) {
  const { t } = useTranslation();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = `${inputId}-label`;
  const [fileName, setFileName] = useState<string | null>(null);

  // Read rather than left to a Tailwind peer-variant: the invalid state
  // arrives as a prop already, and a plain conditional is one less thing that
  // can silently not compile into the stylesheet.
  const isInvalid = ariaInvalid === true || ariaInvalid === "true";

  return (
    <div className="flex w-full flex-col gap-2">
      <Label id={labelId} htmlFor={inputId}>
        {label}
      </Label>

      <div className="relative flex items-center">
        {/* aria-labelledby pins the accessible name to the field label alone.
            Without it the visible <label> below would be a SECOND label for the
            same input, and a screen reader would announce both concatenated. */}
        <input
          id={inputId}
          type="file"
          aria-labelledby={labelId}
          aria-invalid={ariaInvalid}
          className="peer sr-only"
          onChange={(event) => {
            setFileName(event.target.files?.[0]?.name ?? null);
            onChange?.(event);
          }}
          {...props}
        />

        <label
          htmlFor={inputId}
          className={cn(
            // pr-10 (e não px-3 dos dois lados): o ícone de nuvem é absoluto e
            // fica por cima da direita do campo. Sem essa reserva, um nome de
            // arquivo longo corre por baixo dele.
            "flex h-9 w-full cursor-pointer items-center gap-3 rounded-md border border-input bg-transparent py-1 pl-3 pr-10 text-sm shadow-xs",
            // The focus ring lives here because the input it belongs to is
            // visually hidden; `peer` is what lets this element react to it.
            "peer-focus-visible:border-ring peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
            isInvalid && "border-destructive ring-destructive/20",
            className,
          )}
        >
          <span className="shrink-0 rounded bg-secondary px-2 py-1 text-sm font-medium">
            {t("file.chooseButton")}
          </span>
          {/* min-w-0 é o que faz o truncate funcionar: um item de flex mantém a
              largura mínima automática do próprio conteúdo, então sem ele um
              nome de arquivo longo EMPURRA o campo em vez de encurtar — era o
              que quebrava o layout do upload. Mesma armadilha do título da
              Topbar. */}
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {fileName ?? placeholder}
          </span>
        </label>

        <CloudUpload
          className="pointer-events-none absolute right-0 mr-4 size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </div>
    </div>
  );
}

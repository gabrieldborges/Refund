import { useId, useState, type ComponentProps } from "react";
import Text from "../atoms/Text";
import Icon from "../atoms/Icon";
import CloudArrowUpIcon from "../../assets/icons/CloudArrowUp.svg?react";

interface InputFileProps extends Omit<ComponentProps<"input">, "type" | "size"> {
  label?: string;
  placeholder?: string;
  error?: string;
}

export default function InputFile({
  label = "Comprovante",
  placeholder = "Nome do arquivo.pdf",
  error,
  onChange,
  ...props
}: InputFileProps) {
  const inputId = useId();
  const [fileName, setFileName] = useState<string | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFileName(event.target.files?.[0]?.name ?? null);
    onChange?.(event);
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <Text variant="label-small" className="text-gray-200 uppercase">
        {label}
      </Text>
      <label
        htmlFor={inputId}
        className="border border-solid border-gray-300 rounded-lg flex items-center justify-between gap-3 h-12 py-2 pl-4 pr-2 cursor-pointer hover:border-green-100 transition"
      >
        <Text variant="paragraph-medium" className={fileName ? "text-gray-100" : "text-gray-200"}>
          {fileName ?? placeholder}
        </Text>
        <span className="w-9 h-9 rounded bg-green-100 hover:bg-green-200 transition flex items-center justify-center">
          <Icon svg={CloudArrowUpIcon} className="w-5 h-5 fill-white" />
        </span>
      </label>
      <input id={inputId} type="file" className="hidden" onChange={handleChange} {...props} />
      {error && (
        <Text variant="label-small" className="text-error">
          {error}
        </Text>
      )}
    </div>
  );
}

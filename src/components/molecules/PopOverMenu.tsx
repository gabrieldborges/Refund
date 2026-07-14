import { Popover } from "radix-ui";
import Text from "../atoms/Text";
import { useState } from "react";
import InputLabelWrapper from "./InputLabelWrapper";
import CarrotDownIcon from "../../assets/icons/CaretDown.svg?react";
import CheckIcon from "../../assets/icons/Check.svg?react";
import Icon from "../atoms/Icon";

export interface PopOverMenuOption {
  label: string;
  value: string;
}

interface PopOverMenuProps {
  options: PopOverMenuOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
}

// Controlável por fora (value/onChange) pra dar pra plugar num
// react-hook-form via <Controller>, mas o aberto/fechado do popover
// continua sendo estado interno — isso é só apresentação, ninguém de
// fora precisa saber se o menu está aberto.
export default function PopOverMenu({ options, value, onChange, label = "Categoria", error }: PopOverMenuProps) {
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const [open, setOpen] = useState(false);

  function handleSelectOption(option: PopOverMenuOption) {
    onChange?.(option.value);
    setOpen(false);
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <InputLabelWrapper
            className="w-full"
            label={label}
            focused={open}
            icon={CarrotDownIcon}
          >
            <Text variant="paragraph-medium" className="text-gray-200">
              {selectedOption?.label ? selectedOption.label : "Selecione"}
            </Text>
          </InputLabelWrapper>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            // Radix expõe a largura do trigger via essa variável CSS, então
            // o menu sempre fica do mesmo tamanho do campo que o abriu.
            style={{ width: "var(--radix-popover-trigger-width)" }}
            className={`rounded-lg shadow-lg bg-gray-400 my-2 outline-none border-1 border-gray-300 data-[state=open]:animate-in
                    data-[state=open]:fade-in-0
                    data-[state=open]:slide-in-from-top-[5%]
                    data-[state=closed]:animate-out
                    data-[state=closed]:fade-out-0
                    data-[state=closed]:slide-out-to-top-[5%]`}
          >
            <ul className="py-2 ">
              {options.map((option) => (
                <div
                  className="flex items-center justify-between  hover:bg-gray-300 w-full cursor-pointer py-3 px-4"
                  onClick={() => handleSelectOption(option)}
                  key={option.value}
                >
                  <li className="">
                    <Text
                      variant="paragraph-medium"
                      className={`${option.value === selectedOption?.value ? "text-gray-100" : "text-gray-200"}`}
                    >
                      {option.label}
                    </Text>
                  </li>
                  {option.value === selectedOption?.value && (
                    <Icon svg={CheckIcon} className="w-4 h-4 text-green-100" />
                  )}
                </div>
              ))}
            </ul>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {error && (
        <Text variant="label-small" className="text-error">
          {error}
        </Text>
      )}
    </div>
  );
}

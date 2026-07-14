import { Popover } from "radix-ui";
import Text from "../atoms/Text";
import React, { useState } from "react";
import InputLabelWrapper from "./InputLabelWrapper";
import CarrotDownIcon from "../../assets/icons/CaretDown.svg?react";
import CheckIcon from "../../assets/icons/Check.svg?react";
import Icon from "../atoms/Icon";

export default function PopOverMenu() {
  const popOverMenuOptions: PopOverMenuOption[] = [
    {
      label: "Alimentação",
      value: "alimentacao",
    },
    {
      label: "Transporte",
      value: "transporte",
    },
    {
      label: "Hospedagem",
      value: "hospedagem",
    },
    {
      label: "Serviços",
      value: "servicos",
    },
    {
      label: "Outros",
      value: "outros",
    },
  ];
  type PopOverMenuOption = {
    label: string;
    value: string;
  };

  const popOverMenuWidth = 450;
  const [selectedOption, setSelectedOption] =
    useState<PopOverMenuOption | null>(null);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);

  React.useEffect(() => {
    setFocused(open);
  }, [open]);

  function handleSelectOption(option: PopOverMenuOption) {
    setSelectedOption(option);
    setFocused(open);
    setOpen(false);
  }
  return (
    <div style={{ width: `${popOverMenuWidth}px` }}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <InputLabelWrapper
            className="w-full "
            label="Categoria"
            focused={focused}
            icon={CarrotDownIcon}
          >
            <Text variant="paragraph-medium" className="text-gray-200">
              {selectedOption?.label ? selectedOption.label : "Selecione"}
            </Text>
          </InputLabelWrapper>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            style={{ width: `${popOverMenuWidth}px` }}
            className={` rounded-lg  shadow-lg bg-gray-400 my-2 outline-none border-1 border-gray-300 data-[state=open]:animate-in
                    data-[state=open]:fade-in-0
                    data-[state=open]:slide-in-from-top-[5%]
                    data-[state=closed]:animate-out
                    data-[state=closed]:fade-out-0
                    data-[state=closed]:slide-out-to-top-[5%]`}
          >
            <ul className="py-2 ">
              {popOverMenuOptions.map((option) => (
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
    </div>
  );
}

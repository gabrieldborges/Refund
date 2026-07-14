import { tv, type VariantProps } from "tailwind-variants";
import cx from "classnames";
import Icon from "../atoms/Icon";
import Text from "../atoms/Text";
import type { ComponentProps, ReactNode } from "react";
import InputLabelWrapper from "./InputLabelWrapper";



export const inputTextVariants = tv({
  base: `
    bg-transparent outline-none placeholder:text-gray-200
    text-accent-paragraph flex-1 text-sm leading-[180%] font-regular
  `,
});


interface InputTextProps
  extends
    VariantProps<typeof inputTextVariants>,
    Omit<ComponentProps<"input">, "size" | "disabled"> {
  icon?: ComponentProps<typeof Icon>["svg"];
  error?: ReactNode;
  label?: string;
  disabled?: boolean;
}

export default function InputText({
  error,
  disabled,
  className,
  icon,
  label,
  ...props
}: InputTextProps) {
  return (
    // min-w-0 é necessário pra este campo conseguir encolher quando está
    // lado a lado com outro num flex row (ex: Categoria + Valor) — sem
    // isso, o <input> nativo nunca encolhe abaixo da sua largura mínima
    // padrão do navegador (~190px), e os dois campos somados estouram a linha.
    <div className={cx("w-full min-w-0", className)}>
      <InputLabelWrapper label={label} icon={icon}>
        
        <input
          type="text"
          className={inputTextVariants()}
          disabled={disabled as boolean}
          {...props}
        />
        
      </InputLabelWrapper>
      {error && (
        <Text variant="label-small" className="text-error">
          {error}
        </Text>
      )}
    </div>
  );
}

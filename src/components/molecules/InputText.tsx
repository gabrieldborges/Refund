import { tv, type VariantProps } from "tailwind-variants";
import cx from "classnames";
import { useId, type ComponentProps, type ReactNode } from "react";
import Icon from "../atoms/Icon";
import Text from "../atoms/Text";
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
  id,
  ...props
}: InputTextProps) {
  // Um id estável liga a <label> ao <input> (htmlFor) e a mensagem de erro ao
  // campo (aria-describedby). useId gera um id único por instância; respeita um
  // id vindo do chamador, se houver.
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    // min-w-0 é necessário pra este campo conseguir encolher quando está
    // lado a lado com outro num flex row (ex: Categoria + Valor) — sem
    // isso, o <input> nativo nunca encolhe abaixo da sua largura mínima
    // padrão do navegador (~190px), e os dois campos somados estouram a linha.
    <div className={cx("w-full min-w-0", className)}>
      <InputLabelWrapper label={label} icon={icon} htmlFor={inputId}>
        <input
          id={inputId}
          type="text"
          className={inputTextVariants()}
          disabled={disabled as boolean}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
      </InputLabelWrapper>
      {error && (
        <Text as="span" id={errorId} variant="label-small" className="text-error">
          {error}
        </Text>
      )}
    </div>
  );
}

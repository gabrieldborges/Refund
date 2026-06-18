import { tv, type VariantProps } from "tailwind-variants";
import Icon from "./Icon";
import Text from "./Text";
import type { ComponentProps, ReactNode } from "react";

export const inputTextContainerVariants = tv({
  base: "group flex flex-col gap-2 w-full",
});

export const inputTextWrapperVariants = tv({
  base: `
    border border-solid border-gray-300 
     bg-transparent 
    rounded-lg flex items-center gap-3
    focus-within:border-green-100 transition-all duration-200
  `,
  variants: {
    size: {
      md: "h-12 py-4 pl-4",
    },
    disabled: {
      true: "pointer-events-none",
    },
  },
  defaultVariants: {
    size: "md",
    disabled: false,
  },
});

export const inputTextVariants = tv({
  base: `
    bg-transparent outline-none placeholder:text-gray-200
    text-accent-paragraph flex-1 text-sm leading-[180%] font-regular
  `,
});

export const inputTextIconVariants = tv({
  base: "fill-gray-200 group-focus-within:fill-green-100 transition-colors duration-200",
  variants: {
    size: {
      md: "w-6 h-6",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const inputTextLabelVariants = tv({
  base: "text-gray-200 uppercase group-focus-within:text-green-100 transition-colors duration-200 pointer-events-none",
});

interface InputTextProps
  extends
    VariantProps<typeof inputTextWrapperVariants>,
    Omit<ComponentProps<"input">, "size" | "disabled"> {
  icon?: ComponentProps<typeof Icon>["svg"];
  error?: ReactNode;
  label?: string;
}

export default function InputText({
  error,
  size,
  disabled,
  className,
  icon,
  label,
  ...props
}: InputTextProps) {
  return (
    <div className={inputTextContainerVariants({ className })}>
      {label && (
        <Text
          variant="label-small"
          className={inputTextLabelVariants()}
        >
          {label}
        </Text>
      )}
      <div className={inputTextWrapperVariants({ size, disabled })}>
        {icon && (
          <Icon svg={icon} className={inputTextIconVariants({ size })} />
        )}
        <input
          type="text"
          className={inputTextVariants()}
          disabled={disabled as boolean}
          {...props}
        />
      </div>
      {error && (
        <Text variant="label-small" className="text-error">
          {error}
        </Text>
      )}
    </div>
  );
}

import { tv } from "tailwind-variants";
import Icon from "../atoms/Icon";
import Text from "../atoms/Text";
import type { ComponentProps } from "react";
import cn from "classnames";

export const InputLabelWrapperContainerVariants = tv({
  base: "group flex flex-col gap-2 w-full ",
});

export const InputLabelWrapperVariants = tv({
  base: `
    border border-solid border-gray-300 
     bg-transparent 
    rounded-lg flex items-center justify-between gap-3
    focus-within:border-green-100 transition-all duration-200
  `,
  variants: {
    size: {
      md: "h-12 py-4 px-4",
    },
    disabled: {
      true: "pointer-events-none",
    },
    focused: {
      true: "border-green-100",
    },
  },
  defaultVariants: {
    size: "md",
    disabled: false,
    focused: false,
  },
});

export const InputLabelWrapperIconVariants = tv({
  base: "fill-gray-200 group-focus-within:fill-green-100 transition-colors duration-200",
  variants: {
    size: {
      md: "w-6 h-6",
    },
    focused: {
      true: "fill-green-100",
    },
  },
  defaultVariants: {
    size: "md",
    focused: false,
  },
});

export const InputLabelWrapperLabelVariants = tv({
  base: "text-gray-200 uppercase group-focus-within:text-green-100 transition-colors duration-200 pointer-events-none",
  variants: {
    focused: {
      true: "text-green-100",
    },
  },
  defaultVariants: {
    focused: false,
  },
});

interface InputLabelWrapperProps extends React.ComponentProps<"div"> {
  label?: string;
  icon?: ComponentProps<typeof Icon>["svg"];
  focused?: boolean;
  // Id do input que esta label descreve. Renderiza a label como <label htmlFor>,
  // associando-a ao campo para leitores de tela e clique.
  htmlFor?: string;
}

export default function InputLabelWrapper({
  label,
  className,
  children,
  icon,
  focused = false,
  htmlFor,
  ...props
}: InputLabelWrapperProps) {
  return (
    <div
      className={cn(InputLabelWrapperContainerVariants(), className)}
      {...props}
    >
      {label && (
        <Text
          as="label"
          htmlFor={htmlFor}
          variant="label-small"
          className={InputLabelWrapperLabelVariants({ focused })}
        >
          {label}
        </Text>
      )}
      <div className={InputLabelWrapperVariants({ focused })}>
        {children}
        {icon && (
          <Icon svg={icon} className={cn(InputLabelWrapperIconVariants({ focused }),`transition-transform duration-200 ${!focused ? "" : "rotate-180"}`)} />
        )}
      </div>
    </div>
  );
}

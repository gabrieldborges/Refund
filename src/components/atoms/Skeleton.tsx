import { tv, type VariantProps } from "tailwind-variants";

export const skeletonVariants = tv({
  base: "bg-gray-400 animate-pulse",
  variants: {
    shape: {
      rect: "rounded",
      circle: "rounded-full",
    },
  },
  defaultVariants: {
    shape: "rect",
  },
});

interface SkeletonProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof skeletonVariants> {}

// Peça genérica do design system: um retângulo/círculo cinza pulsando.
// Tamanho e forma final ficam por conta de quem usa (className + shape) —
// cada tela monta o "esqueleto" combinando vários Skeleton no formato do
// conteúdo real que vai substituir (ex: um círculo pro ícone + duas barras
// pro texto, imitando um item de lista).
export default function Skeleton({ shape, className, ...props }: SkeletonProps) {
  return <div className={skeletonVariants({ shape, className })} {...props} />;
}

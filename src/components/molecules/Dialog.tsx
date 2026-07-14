import * as DialogPrimitive from "@radix-ui/react-dialog";
import cn from "classnames";


export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;


type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content>;

export default function DialogContent({ children, className, ref, ...props }: DialogContentProps) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 bg-gray-100/50" />
            <DialogPrimitive.Content
                className={cn(
                    // w-[calc(100%-4px)]: deixa 2px de respiro de cada lado da tela.
                    // Não dá pra usar margin aqui — a largura já é 100% do viewport
                    // (position: fixed), margin só somaria por cima e voltaria a
                    // estourar; o jeito certo é encolher a própria largura.
                    "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-4px)] max-w-md rounded-lg p-6 bg-white shadow-lg outline-none",
                    className
                )}
                ref={ref}
                {...props}
            >
                {children}
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    )
}


export function DialogBody({ children, className, ...props }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={className} {...props}>
            {children}
        </div>
    )
}

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EntityDialogProps<T> {
  title: string;
  TriggerButton: React.ReactNode;
  FormComponent: React.ComponentType<T & { onClose: () => void }>;
  formProps: T;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EntityDialog<T>({
  title,
  TriggerButton,
  FormComponent,
  formProps,
  open: controlledOpen,
  onOpenChange,
}: EntityDialogProps<T>) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <FormComponent {...formProps} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

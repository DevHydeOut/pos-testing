// components/common/EntityEditDialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EntityEditDialogProps<T> {
  title: string;
  TriggerButton: React.ReactNode;
  initialData: T;
  FormComponent: (props: { onClose: () => void; initialData: T }) => React.ReactNode;
}

export function EntityEditDialog<T>({
  title,
  TriggerButton,
  initialData,
  FormComponent,
}: EntityEditDialogProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {FormComponent({ onClose: () => setOpen(false), initialData })}
      </DialogContent>
    </Dialog>
  );
}

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

const ConfirmDialog = ({
  open,
  onClose,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  danger = false,
}) => {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-brand-navy/50" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-brand shadow-brand p-6">
              <Dialog.Title className="font-display text-xl text-brand-navy">
                {title}
              </Dialog.Title>
              {description && (
                <p className="mt-2 text-xs text-brand-soft m-0">{description}</p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm font-semibold text-brand-soft"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={`inline-flex items-center text-white text-sm font-bold px-4 py-2 rounded-brand ${
                    danger ? "bg-rose-600" : "bg-brand-teal"
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConfirmDialog;

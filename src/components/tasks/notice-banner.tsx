"use client";

import {
  Stack,
  ToastCloseTrigger,
  ToastIndicator,
  ToastRoot,
  ToastTitle,
  Toaster,
  createToaster,
} from "@chakra-ui/react";
import { useEffect, useRef } from "react";

export type Notice = {
  tone: "success" | "error";
  text: string;
};

function sameNotice(a: Notice, b: Notice) {
  return a.tone === b.tone && a.text === b.text;
}

const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
});

function showToast(create: () => void) {
  queueMicrotask(create);
}

type NoticeBannerProps = {
  listError: string | null;
  notice: Notice | null;
};

export function NoticeBanner({ listError, notice }: NoticeBannerProps) {
  const shownListError = useRef<string | null>(null);
  const shownNotice = useRef<Notice | null>(null);

  useEffect(() => {
    if (!listError) {
      shownListError.current = null;
      return;
    }
    if (listError === shownListError.current) {
      return;
    }

    shownListError.current = listError;
    showToast(() => toaster.error({ title: listError }));
  }, [listError]);

  useEffect(() => {
    if (!notice || (shownNotice.current !== null && sameNotice(notice, shownNotice.current))) {
      return;
    }

    shownNotice.current = notice;
    showToast(() => toaster.create({ title: notice.text, type: notice.tone }));
  }, [notice]);

  return (
    <Toaster toaster={toaster}>
      {(toast) => (
        <ToastRoot key={toast.id} width="sm" maxW="calc(100vw - 2rem)">
          <ToastIndicator />
          <Stack gap="1" flex="1" minW="0">
            <ToastTitle>{toast.title}</ToastTitle>
          </Stack>
          <ToastCloseTrigger aria-label="Dismiss message" />
        </ToastRoot>
      )}
    </Toaster>
  );
}

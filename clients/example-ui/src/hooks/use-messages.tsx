import { AnyRef, Log } from "@daydreamsai/core";
import { useState } from "react";

export function useMessages() {
  const [messages, setMessages] = useState<any[]>([]);

  function handleLog(log: AnyRef, _done: boolean) {
    if (log.ref === "input") {
      setMessages((msgs) => [
        ...msgs.filter((msg) => msg.id !== log.id),
        {
          id: log.id,
          type: "user",
          message: log.data.content,
        },
      ]);
    }
    if (log.ref === "thought") {
      setMessages((msgs) => [
        ...msgs.filter((msg) => msg.id !== log.id),
        {
          id: log.id,
          type: "thought",
          message: log.content + "\n",
        },
      ]);
    }

    if (log.ref === "output") {
      if (log.type === "message") {
        setMessages((msgs) => [
          ...msgs.filter((msg) => msg.id !== log.id),
          {
            id: log.id,
            type: "assistant",
            message: log.data ?? log.content,
            params: log.params,
          },
        ]);
      }
      if (log.type === "document") {
        setMessages((msgs) => [
          ...msgs.filter((msg) => msg.id !== log.id),
          {
            id: log.id,
            type: "document",
            message: log.data ?? log.content,
            params: log.params,
          },
        ]);
      }
      if (log.type === "artifact") {
        setMessages((msgs) => [
          ...msgs.filter((msg) => msg.id !== log.id),
          {
            id: log.id,
            type: "artifact",
            message: log.data ?? log.content,
            params: log.params,
          },
        ]);
      }
    }
    if (log.ref === "action_call") {
      setMessages((msgs) => [
        ...msgs.filter((msg) => msg.id !== log.id),
        {
          id: log.id,
          type: "system",
          message: `Action call\nAction:${log.name}\nId:${log.id}\nData:${JSON.stringify(log.data)}`,
        },
      ]);
    }
    if (log.ref === "action_result") {
      setMessages((msgs) => [
        ...msgs.filter((msg) => msg.id !== log.id),
        {
          id: log.id,
          type: "system",
          message: `Action Result\nAction:${log.name}\nId:${log.id}\nData:${JSON.stringify(log.data)}`,
        },
      ]);
    }
  }

  return {
    messages,
    setMessages,
    handleLog,
  };
}

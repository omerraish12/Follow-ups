import { useIsFetching } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import clsx from "clsx";

const GlobalFetchIndicator = () => {
  const isFetching = useIsFetching();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isFetching) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 200);
    return () => clearTimeout(t);
  }, [isFetching]);

  return (
    <div
      className={clsx(
        "pointer-events-none fixed inset-x-0 top-0 z-50 transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
      aria-hidden="true"
    >
      <div className="h-0.5 w-full animate-pulse bg-gradient-to-r from-emerald-400 via-sky-400 to-purple-500" />
    </div>
  );
};

export default GlobalFetchIndicator;

type ApiError = {
  response?: {
    data?: { message?: string };
    headers?: Record<string, string>;
  };
  message?: string;
  requestId?: string;
};

export const getErrorDetails = (error: ApiError, fallback = "Something went wrong.") => {
  const message =
    error?.response?.data?.message ||
    error?.message ||
    fallback;
  const requestId =
    error?.requestId ||
    error?.response?.headers?.["x-request-id"];

  return { message, requestId };
};

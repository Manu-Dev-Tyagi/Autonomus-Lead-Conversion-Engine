export function Toast(props: {
  message: string;
  tone?: "success" | "error" | "info";
}) {
  const tone = props.tone ?? "info";
  return <div className={`ale-toast ale-toast-${tone}`}>{props.message}</div>;
}

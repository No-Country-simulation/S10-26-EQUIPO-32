import { notFound } from "next/navigation";
import DemoUI from "../../../demo/demo-ui/page";

// Montaje de la demo SOLO en desarrollo (ui-brief §9): en producción esta ruta responde 404.
export default function PaginaDemo() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DemoUI />;
}

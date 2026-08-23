import { ClientPortalDemo } from "@/components/portal/clientPortalDemo";

export default function PortalDemoPage() {
  return <ClientPortalDemo paymentUrl={process.env.NEXT_PUBLIC_FLUTTERWAVE_PAYMENT_LINK} driveUrl={process.env.NEXT_PUBLIC_CLIENT_DRIVE_URL} />;
}

import React from "react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";

export default function CashierDashboard() {
  return (
    <Card>
      <CardHeader title="Cashier Dashboard" subtitle="Quick actions: scan SKU and search catalog." />
      <CardBody>
        <div className="text-sm text-gray-600">
          Next: POS page (cart, totals, receipts).
        </div>
      </CardBody>
    </Card>
  );
}
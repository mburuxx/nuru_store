import React from "react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";

export default function OwnerDashboard() {
  return (
    <Card>
      <CardHeader title="Owner Dashboard" subtitle="Manage catalog, inventory, sales and notifications." />
      <CardBody>
        <div className="text-sm text-gray-600">
          Next: add summary cards (low stock, today sales, recent notifications).
        </div>
      </CardBody>
    </Card>
  );
}
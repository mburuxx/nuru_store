import React from "react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";

export default function Unauthorized() {
  return (
    <Card>
      <CardHeader title="Unauthorized" subtitle="You don’t have permission to view this page." />
      <CardBody>
        <p className="text-sm text-gray-600">If you think this is a mistake, contact the Owner/Superuser.</p>
      </CardBody>
    </Card>
  );
}
from decimal import Decimal
from rest_framework import serializers

from .models import Sale, SaleItem, Receipt, Invoice, Payment

class SaleItemCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

class SaleCreateSerializer(serializers.Serializer):
    payment_type = serializers.ChoiceField(
        choices=Sale.PaymentType.choices,
        default=Sale.PaymentType.PAY_NOW
    )

    payment_method = serializers.ChoiceField(
        choices=Sale.PaymentMethod.choices,
        required=False,
        allow_null=True
    )

    amount_paid = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False
    )

    due_date = serializers.DateField(required=False)

    customer_name = serializers.CharField(required=False, allow_blank=True)
    customer_phone = serializers.CharField(required=False, allow_blank=True)

    items = SaleItemCreateSerializer(many=True)

    def validate(self, attrs):
        ptype = attrs.get("payment_type", Sale.PaymentType.PAY_NOW)
        method = attrs.get("payment_method", None)
        due_date = attrs.get("due_date", None)

        amount_paid = attrs.get("amount_paid", None)

        if amount_paid is None and ptype == Sale.PaymentType.CREDIT:
            amount_paid = Decimal("0.00")
            attrs["amount_paid"] = amount_paid

        if ptype == Sale.PaymentType.CREDIT and not due_date:
            raise serializers.ValidationError({"due_date": "Due date is required for credit sales."})

        if amount_paid is not None and amount_paid > Decimal("0.00") and not method:
            raise serializers.ValidationError({"payment_method": "Payment method is required when amount_paid > 0."})

        if ptype == Sale.PaymentType.PAY_NOW and not method:
            raise serializers.ValidationError({"payment_method": "This field is required for Pay Now sales."})

        if amount_paid is not None and amount_paid < Decimal("0.00"):
            raise serializers.ValidationError({"amount_paid": "Must be >= 0."})
        return attrs

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = SaleItem
        fields = ["id", "product_name", "sku", "quantity", "unit_price_snapshot", "line_total"]

class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = ["receipt_number", "generated_at"]

class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ["invoice_number", "status", "due_date", "issued_at"]

class PaymentSerializer(serializers.ModelSerializer):
    received_by_username = serializers.CharField(source="received_by.username", read_only=True)

    class Meta:
        model = Payment
        fields = ["id", "method", "amount", "reference", "received_by_username", "received_at"]

class SaleDetailSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    receipt = ReceiptSerializer(read_only=True)
    invoice = InvoiceSerializer(read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    cashier_username = serializers.CharField(source="cashier.username", read_only=True)
    balance_due = serializers.SerializerMethodField()
    document_type = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            "id",
            "status",
            "cashier_username",

            "payment_type",
            "payment_status",
            "payment_method",

            "subtotal", "discount", "total",
            "amount_paid", "balance_due", "due_date",
            "customer_name", "customer_phone",

            "created_at",
            "items",
            "receipt",
            "invoice",
            "payments",
            "document_type",
        ]

    def get_balance_due(self, obj):
        return str(max(Decimal("0.00"), obj.total - obj.amount_paid))

    def get_document_type(self, obj):
        if obj.payment_status in (Sale.PaymentStatus.UNPAID, Sale.PaymentStatus.PARTIAL):
            return "INVOICE"
        return "RECEIPT"
    
class AddPaymentSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=Sale.PaymentMethod.choices)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    reference = serializers.CharField(required=False, allow_blank=True)
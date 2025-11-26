import { Button } from "../ui/button";
import { CurrencyRow } from "../customerReceipt/CustomerReceipt"; 

interface ConfirmationModalProps {
  open: boolean;
  previewData: {
    customerName: string;
    nicPassport: string;
    date: string;
    sources: string[];
    otherSource: string;
    rows: CurrencyRow[];
  } | null;
  sourceLabels: Record<string, string>;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const ConfirmationModal = ({
  open,
  previewData,
  sourceLabels,
  onClose,
  onConfirm,
  isLoading
}: ConfirmationModalProps) => {
  if (!open || !previewData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl p-6 sm:p-8 max-w-2xl w-full shadow-xl mx-4">
        {/* Header */}
        <h3 className="text-2xl font-semibold text-gray-900 mb-6">
          Confirm Transaction
        </h3>

        {/* Customer Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
          <div>
            <p className="text-gray-700 text-sm">
              <span className="font-semibold text-gray-900">Customer Name:</span>
              <br />
              {previewData.customerName}
            </p>
            <p className="text-gray-700 text-sm mt-2">
              <span className="font-semibold text-gray-900">NIC/Passport:</span>
              <br />
              {previewData.nicPassport}
            </p>
          </div>
          <div>
            <p className="text-gray-700 text-sm">
              <span className="font-semibold text-gray-900">Date:</span>
              <br />
              {previewData.date}
            </p>
            <p className="text-gray-700 text-sm mt-2">
              <span className="font-semibold text-gray-900">Sources:</span>
              <br />
              {previewData.sources
                .map((key) => sourceLabels[key] || key)
                .join(", ")}
              {previewData.otherSource && `, ${previewData.otherSource}`}
            </p>
          </div>
        </div>

        {/* Currency Table */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-2 text-sm">
            Currency Details
          </h4>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 font-medium text-gray-700 border-b">
                    Type
                  </th>
                  <th className="px-4 py-2 font-medium text-gray-700 border-b">
                    Received (FCY)
                  </th>
                  <th className="px-4 py-2 font-medium text-gray-700 border-b">
                    Rate
                  </th>
                  <th className="px-4 py-2 font-medium text-gray-700 border-b">
                    Issued (LKR)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewData.rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-2 text-gray-900 font-medium">
                      {row.currencyType}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {row.amountReceived}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{row.rate}</td>
                    <td className="px-4 py-2 text-gray-900 font-medium">
                      {row.amountIssued}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-sm"
          >
            {isLoading ? "Processing..." : "Confirm & Process"}
          </Button>
        </div>
      </div>
    </div>
  );
};
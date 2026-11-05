import EquipmentForm from "@/components/EquipmentForm";
import { PageHeader } from "@/components/ui";

export default function NewEquipment() {
  return (<><PageHeader title="Nouvel équipement" /><EquipmentForm id={null} initial={{ name: "", type: "autre", manufacturer: "", osVersion: "", ipAddress: "", interfaces: "", vlans: "", role: "", notes: "" }} /></>);
}

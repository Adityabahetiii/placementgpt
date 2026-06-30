import ChatArea from "../components/ChatArea";
import { useLocation } from "react-router-dom";

export default function Dashboard() {
  const location = useLocation();

  return <ChatArea key={location.search} />;
}
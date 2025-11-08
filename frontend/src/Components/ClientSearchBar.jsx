import { FaSearch } from "react-icons/fa";

const ClientSearchBar = ({ searchTerm, onSearch }) => {
  const handleChange = (e) => {
    onSearch(e.target.value);
  };

  return (
    <div className="relative mb-6 w-full max-w-lg mx-auto">
      <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg" />
      <input
        type="text"
        placeholder="Buscar"
        value={searchTerm}
        onChange={handleChange}
        className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-200 shadow text-gray-900 placeholder-gray-500 outline-none border-none transition focus:bg-gray-300"
        style={{ fontWeight: 500, fontSize: "1rem" }}
      />
    </div>
  );
};

export default ClientSearchBar;

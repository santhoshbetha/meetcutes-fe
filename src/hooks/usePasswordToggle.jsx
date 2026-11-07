import { useState } from "react";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";

const usePasswordToggle = () => {
  const [visible, setVisiblity] = useState(false);

  const Icon = visible ? (
    <IoEyeOutline
      size={25}
      onClick={() => setVisiblity((visiblity) => !visiblity)}
    />
  ) : (
    <IoEyeOffOutline
      size={25}
      onClick={() => setVisiblity((visiblity) => !visiblity)}
    />
  );

  const InputType = visible ? "text" : "password";

  return [InputType, Icon];
};

export default usePasswordToggle;

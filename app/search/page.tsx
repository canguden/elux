import { h } from "../../elux/core/vdom";
import { Counter } from "../components/Counter";

const page = () => {
  return (
    <div className="container">
      <h1>Hello World</h1>
      <Counter />
    </div>
  );
};

export default page;

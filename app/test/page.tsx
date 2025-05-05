import { h } from "../../elux/core/vdom";
import { Counter } from "../components/Counter";

const page = () => {
  return (
    <div className="container">
      <h1>Hello World</h1>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.
      </p>
      <Counter />
    </div>
  );
};

export default page;

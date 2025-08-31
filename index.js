import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatAnthropic } from "@langchain/anthropic";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";

const llm = new ChatAnthropic({
  apiKey:process.env.OPNAIKEY, 
  model: process.env.MODEL
});

const multiply = tool(
  async(({ a, b }) => {
    return a * b;
  }),
  {
    name: "multiply",
    description: "Multiplies two numbers.",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);

const add = tool(
  async(({ a, b }) => {
    return a + b;
  }),
  {
    name: "add",
    description: "Adds two numbers.",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);
const divide = tool(
  async(({ a, b }) => {
    if (b === 0) {
      throw new Error("Division by zero is not allowed.");
    }
    return a / b;
  }),
  {
    name: "divide",
    description: "Divides two numbers.",
    schema: z.object({
      a: z.number().describe("dividend"),
      b: z.number().min(1).describe("divisor"),
    }),
  }
);
const tools = [add, multiply, divide];
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
const llmWithTools = llm.bindTools(tools);

async function llmCall(state) {
  //LLM decide whether to call tool or not
  const result = await llmWithTools.invoke([
    {
      role: "system",
      content:
        "You are a helpful assistant tasked with performing arithmetic on a set of inputs",
    },
    ...state.messages,
  ]);
  return {
    messages: [result],
  };
}

const graph = new StateGraph({
  initialState: {
    messages: [{
      role: "user",
      content: "What is 2 + 2?"
    }]
  },
  transition: async (state) => {
    const result = await llmCall(state);
    return result;
  },
});
graph.invoke();

graph.on("end", (state) => {
  console.log(state);
});

graph.on("error", (error) => {
  console.error(error);
});
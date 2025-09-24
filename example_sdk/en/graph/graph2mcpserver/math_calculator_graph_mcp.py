from fastmcp import FastMCP
import requests
import json

mcp = FastMCP(
    name="math_calculator_graph_graph",
    instructions="""This server provides access to the MAG graph 'math_calculator_graph' in sequential execution mode.
    A single-node mathematical problem solving graph where users input mathematical expressions, and the system calls calculator tools to solve and return results.
    Call execute_agents() to run the graph with sequential execution."""
)


@mcp.tool()
def execute_agents(input_text: str, conversation_id: str = None) -> str:
    """This tool contains a multi-agent system that can perform the following functions:

    A single-node mathematical problem solving graph where users input mathematical expressions, and the system calls calculator tools to solve and return results.

    Args:
        input_text: The input text to send to the graph
        conversation_id: Optional. A conversation ID from a previous execution to continue the conversation

    Returns:
        The final result of the agents system execution
    """
    try:
        payload = {"input_text": input_text, "graph_name": "math_calculator_graph", "parallel": False}
        if conversation_id:
            payload["conversation_id"] = conversation_id

        response = requests.post("http://localhost:9999/api/graphs/execute", json=payload)

        if response.status_code == 200:
            result = response.json()
            output = f"""RESULT:
                Conversation ID: {result.get('conversation_id')}
                Output: {result.get('output')}
                Completed: {result.get('completed', False)}"""
            return output
        else:
            return f"Error executing graph: {response.status_code} {response.text}"
    except Exception as e:
        return f"Error: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport="stdio")
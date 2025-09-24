import mag
import json

def run_graph_basic():
    """Demonstrate basic graph execution (non-streaming, wait for completion and return result)"""

    # Execute graph and wait for completion
    result = mag.run_graph(
        name="math_exam",
        input_text="Create a math test paper with a simple computational application problem.",
        stream=False,
        background=False
    )

    # Print conversation details
    print("Graph execution completed!")
    print(f"Conversation ID: {result.get('_id')}")
    print(f"Number of rounds: {len(result.get('rounds', []))}")
    print(f"Final output: {result.get('final_result', '')}")

    # Available content (graph run data saved in MongoDB):
    # - _id: Conversation ID
    # - conversation_id: Conversation ID
    # - graph_name: Graph name
    # - graph_config: Graph configuration
    # - rounds: List of conversation rounds (including user input and AI replies)
    # - input: Initial input
    # - global_outputs: Global outputs (organized by node names)
    # - final_result: Final result
    # - execution_chain: Execution chain
    # - handoffs_status: Handoff status
    # - start_time: Start time
    # - completed: Whether completed
    # - updated_at: Update time


if __name__ == "__main__":
    run_graph_basic()
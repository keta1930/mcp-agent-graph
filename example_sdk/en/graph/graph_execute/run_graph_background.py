import mag
import time

def run_graph_background():
    """Demonstrate background graph execution (immediately return conversation_id)"""

    print("Starting background graph execution...")

    # Execute graph in background, immediately return conversation_id
    conversation_id = mag.run_graph(
        name="math_exam",
        input_text="Create a math test paper with a simple computational application problem.",
        background=True
    )

    print(f"Graph started in background, conversation ID: \n{conversation_id}\n")
    print("You can continue with other tasks while the graph runs in the background...")

if __name__ == "__main__":
    run_graph_background()
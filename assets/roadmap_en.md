# MCP-Agent-Graph Q4 Roadmap

## Summary

Q4 focuses on three core directions: data management optimization, user experience improvements, and system capability expansion. We will prioritize unifying the storage architecture, exporting conversation data, enhancing Agent capabilities, building a user management system, and further improving the task scheduling system, steering mcp-agent-graph toward a more mature, enterprise-grade multi-agent development platform.

---

## Introduction

### Project Evolution

**Version 1 (Apr–May): Foundation Setup**
- First implementation of an agent development framework based on Graph and MCP
- Established node-based, visual orchestration for agent workflows
- Completed development of the core execution engine

**Version 2 (Jun–Aug): Architecture Upgrade and Data Persistence**
- Introduced AI-generated Graph and MCP capabilities, enabling automated agent design
- Integrated MongoDB for persistent management of conversation data
- Adopted MinIO object storage for attachment management
- Formally established three working modes: Chat, Agent, and Graph

**Version 3 (Sep): Feature Polish and UX Optimization**
- **Task Scheduling System**: Supports scheduled/periodic execution of agent-graphs for automated workflows
- **Prompt Center**: Prompt reuse and management to improve development efficiency
- **Graph Parameter Standardization**: Comprehensive updates to configurable node parameters for simpler agent architecture design
- **Agent Mode Enhancements**: Iterative interaction to refine graph design and improve AI generation quality
- **Parallel Optimization**: Support for large-scale parallel graph execution
- **Frontend Refresh**: New page styling with significantly improved visualization and UX

### Current Core Capabilities

**Three Working Modes**
- **Chat Mode**: Multi-model conversations with MCP tool invocation
- **Agent Mode**: AI automatically generates Graph and MCP, enabling self-serve agent development
- **Graph Mode**: Visual orchestration with precise control over multi-agent collaboration flows

**Data Management**
- MongoDB stores conversation history, task records, and execution statistics
- MinIO stores graph execution attachments and generated files
- Local filesystem manages Graph configurations and Prompt templates

**Agent Orchestration**
- Rich node parameter configuration (role, prompt, model, tools)
- Flexible connections (serial, parallel, conditional branching)
- Prompt reference mechanism (`{{@prompt_name}}`)
- Automatic README generation

**Automation & Scheduling**
- One-off, periodic, and Cron scheduling options
- Concurrency execution control
- Execution history tracking

---

## Plan

### Short-Term Goals

#### 1. Data Management Architecture Optimization

- [ ] **Unify MinIO storage architecture**
  - [ ] Migrate graph run attachments from local filesystem to MinIO

- [ ] **Conversation data export**
  - [ ] Support export to training data formats
  - [ ] Support export to human-readable formats
  - [ ] Batch export capabilities

#### 2. Expand Graph Capability Boundary

- [ ] **Increase flexibility of node configuration**
  - [ ] Optimize parameter design to better express agent role definitions
  - [ ] Explore more flexible node configuration to support complex multi-agent collaboration scenarios
  - [ ] Align with industry best practices to make Graph design more intuitive and powerful

#### 3. System-Level Advancement of Agent Mode

- [ ] **Deep system integration**
  - [ ] Integrate Agent Mode more tightly with the mcp-agent-graph system
  - [ ] Enable Agent Mode to access and manage system resources (Graph, Task, Prompt, etc.)
  - [ ] Increase automation, evolving from a single Graph/MCP generator to a more intelligent system assistant

### Medium- to Long-Term Goals

#### 4. Task Scheduling System Optimization

The Task system was introduced in V3 and currently provides basic scheduled/periodic execution. In Q4 we will further improve its robustness and convenience, making it easier to automate repetitive work.

- [ ] **Timely notifications upon task completion**
- [ ] **Chained execution**: automatically trigger the next task after one completes, enabling more complex automation workflows
- [ ] **Execution history and statistics**: view historical runs, success rate, duration, and other metrics
- [ ] **Simpler configuration UI**: streamline task creation and management to lower the usage barrier

#### 5. User Management System

- [ ] **Enhanced multi-user support**
  - [ ] User registration, login, authentication (JWT)
  - [ ] User resource isolation (Graph, Prompt, Conversation, Task)
  - [ ] User quota management (API call counts, storage space)

- [ ] **Access control**
  - [ ] Role definitions (admin, standard user, read-only user)
  - [ ] Resource permissions (private, team-shared, public)
  - [ ] Team/organization support (multi-user collaboration)

- [ ] **User preferences**
  - [ ] Default model selection
  - [ ] UI theme configuration
  - [ ] Notification settings

#### 6. Extended Feature Exploration

- [ ] **Graph version control**
  - [ ] Git-like version management
  - [ ] Branching, merging, rollback
  - [ ] Change history tracking

- [ ] **Multimodal capability enhancements**

- [ ] **Collaboration & sharing**
  - [ ] Shareable links for Graph
  - [ ] Online collaborative Graph editing

### Performance & Stability (Ongoing)

- [ ] **Performance optimization**
  - [ ] Graph execution performance optimization (parallel execution was explored in v1, later removed; future versions will restore parallel capabilities)
  - [ ] Frontend rendering optimization

- [ ] **Stability improvements**
  - [ ] Improved error handling and logging

- [ ] **Developer experience**
  - [ ] API documentation (OpenAPI/Swagger)
  - [ ] SDK development (Python)
  - [ ] Developer documentation and examples

---

## Notes

This roadmap is a planning document. Features and priorities may shift based on actual development progress. Some exploratory features may be postponed to Q4 or later.
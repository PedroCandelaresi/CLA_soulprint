export interface TodoTask {
  id: string | any;
  task: string;
  taskImage: string;
  taskText: string;
  date: string;
  taskProperty: string;
  category?: string;
}

export interface TodoCategory {
  id: string | any;
  name: string;
  child: TodoTask[];
}

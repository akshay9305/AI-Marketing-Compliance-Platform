from pydantic import BaseModel
from typing import List, Optional, Any


class TemplateBase(BaseModel):
    name: str
    category: str = "Email"
    description: Optional[str] = None
    status: Optional[str] = 'Business'


class TemplateCreate(TemplateBase):
    html_content: str
    modules: List[Any]
    module_attributes: Optional[dict] = None
    compliance_score: Optional[int] = 0


class TemplateUpdate(BaseModel):
    html_content: str
    modules: List[Any]
    module_attributes: Optional[dict] = None


class TemplateSummary(BaseModel):
    id: int
    name: str
    category: str
    description: Optional[str]
    compliance_score: int
    created_at: Optional[str]
    schema: Optional[dict] = None
    status: Optional[str] = 'Business'


class FullTemplate(TemplateSummary):
    html_content: Optional[str] = ''
    modules: List[Any] = []
    module_attributes: Optional[dict] = None
    schema: Optional[dict] = None


class ValidationResult(BaseModel):
    template_id: int
    compliance_score: int
    validation_results: List[Any]


class NodeFragment(BaseModel):
    node_id: str
    html_fragment: str


class ModifiedNode(BaseModel):
    node_id: str
    modified_html: str


class RewriteRequest(BaseModel):
    # template_id is optional because the endpoint receives it from path
    template_id: Optional[int] = None
    accepted_issues: Optional[List[Any]] = None
    nodes: Optional[List[NodeFragment]] = None
    rendered_html: Optional[str] = None
    save: Optional[bool] = False


class RewriteResponse(BaseModel):
    modified_nodes: List[ModifiedNode]
    modified_full_html: str
    validation_before: Optional[List[Any]] = None
    validation_after: Optional[List[Any]] = None
    regressions: Optional[bool] = False
    saved: Optional[bool] = False

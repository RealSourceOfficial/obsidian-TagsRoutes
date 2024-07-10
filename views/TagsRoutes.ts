import { App, Editor, moment, ExtraButtonComponent, MarkdownView, MarkdownPreviewView,Modal, Notice, Plugin, PluginSettingTab, Setting, getAllTags, CachedMetadata, TagCache } from 'obsidian';
import { ItemView, WorkspaceLeaf, TFile } from "obsidian";
import * as THREE from 'three';
import { getFileType, getTags, parseTagHierarchy, filterStrings, shouldRemove,setViewType,showFile } from "../util/util"
import ForceGraph3D from "3d-force-graph";
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import * as d3 from 'd3-force-3d';
import { settingGroup } from "views/settings"
import TagsRoutes from 'main';
export const VIEW_TYPE_TAGS_ROUTES = "tags-routes";

interface GraphData {
    nodes: ExtendedNodeObject[];
    links: LinkObject[];
}

// 自定义 LinkObject 类型
interface LinkObject {
    source: string | ExtendedNodeObject;
    target: string | ExtendedNodeObject;
    sourceId: string;  // 添加源ID字段
    targetId: string;  // 添加目标ID字段
}

interface ExtendedNodeObject extends Node {
    type: 'md' | 'tag' | 'attachment' | 'broken' | 'excalidraw';
    x?: number;
    y?: number;
    z?: number;
    connections?: number; // 添加 connections 属性来存储连接数
    instanceNum?: number;
    size?: number;
    neighbors?: ExtendedNodeObject[];
    links?: LinkObject[];
}

interface Node {
    id: string;
    type: string;
}


// 创建 filesDataMap
const filesDataMap: Map<string, CachedMetadata | null> = new Map();
const logFilePath = 'TagsRoutes/logMessage.md'

// 创建一个View 
export class TagRoutesView extends ItemView {
    plugin: TagsRoutes;
    private Graph: any;
    private gData: GraphData = {
        nodes: [],
        links: []
    };
    constructor(leaf: WorkspaceLeaf, plugin: TagsRoutes) {
        super(leaf);
        this.plugin = plugin;
        this.onLinkDistance = this.onLinkDistance.bind(this); // 手动绑定 this
        this.onNodeSize = this.onNodeSize.bind(this);
        this.onNodeRepulsion = this.onNodeRepulsion.bind(this);
        this.onLinkWidth = this.onLinkWidth.bind(this);
        this.onLinkParticleNumber = this.onLinkParticleNumber.bind(this);
        this.onLinkParticleSize = this.onLinkParticleSize.bind(this);
        this.onLinkParticleColor = this.onLinkParticleColor.bind(this);
    }

    getViewType() {
        return VIEW_TYPE_TAGS_ROUTES;
    }

    getDisplayText() {
        return "Tags' Routes";
    }
    private highlightNodes = new Set();
    private previousHighlightNodes = new Set();
    private previousHighlightLinks = new Set();
    private highlightLinks = new Set();
    private hoverNode: ExtendedNodeObject;
    private selectedNode: ExtendedNodeObject | null;

    resetNodeColor() {
        this.previousHighlightNodes.forEach((node: ExtendedNodeObject) => {
            // Access __threeObj to get the Mesh object
            const mesh = (node as any).__threeObj as THREE.Mesh;
            if (mesh && mesh.material) {
                //	console.log("the node: ", node);
                (mesh.material as any).color.set(this.getColorByType(node));
            } else {
                //	console.warn('Node or its material is not defined', node);
            }
        })
        this.previousHighlightLinks.forEach(link => {

        })
        this.highlightLinks.clear();
        this.Graph
            //.nodeColor(this.Graph.nodeColor())
            .linkWidth(this.Graph.linkWidth())
            .linkDirectionalParticles(this.Graph.linkDirectionalParticles());
        if (this.selectedNode) this.onNodeHover(this.selectedNode);

    }
    onNodeHover(node: ExtendedNodeObject) {
        // no state change
        if ((!node && !this.highlightNodes.size) || (node && this.hoverNode === node)) return;

        this.highlightNodes.clear();
        this.highlightLinks.clear();
        if (node) {
            //     console.log("hover node:", node.id)
            //     console.log("hover node links:", node.links)
            this.highlightNodes.add(node);
            this.previousHighlightNodes.add(node);
            if (node.neighbors) {
                node.neighbors.forEach(neighbor => {
                    this.highlightNodes.add(neighbor)
                    this.previousHighlightNodes.add(neighbor)
                });
            }
            if (node.links) {
                node.links.forEach(link => {
                    this.highlightLinks.add(link)
                    this.previousHighlightLinks.add(link)
                    //  console.log ("add link in node hover:", link)
                });
            }
        }
        this.hoverNode = node || null;
        this.updateHighlight();
    }
    onLinkHover(link: LinkObject) {
        this.highlightNodes.clear();
        this.highlightLinks.clear();

        if (link) {
            this.highlightLinks.add(link);
            this.highlightNodes.add(link.source);
            this.highlightNodes.add(link.target);
            this.previousHighlightNodes.add(link.source);
            this.previousHighlightNodes.add(link.target);
        }

        this.updateHighlight();
    }
    updateHighlight() {
        // trigger update of highlighted objects in scene
        this.Graph
            .linkWidth(this.Graph.linkWidth())
            .linkDirectionalParticles(this.Graph.linkDirectionalParticles());
        // Highlight nodes logic
        if (this.highlightNodes.size !== 0) {
            this.highlightNodes.forEach(node => {
                const mesh = (node as any).__threeObj as THREE.Mesh;
                if (mesh && mesh.material) {
                    if (node === this.selectedNode || node === this.hoverNode)
                        (mesh.material as any).color.set('#FF3333');
                    else
                        (mesh.material as any).color.set('#3333ff');
                } else {
                }
            });
        } else {
            this.resetNodeColor()
        }
    }
    focusGraphNodeById(filePath: string) {
        // 获取 Graph 中的相应节点，并将视图聚焦到该节点
        const node = this.gData.nodes.find((node: ExtendedNodeObject) => node.id === filePath);
        if (node && node.x && node.y && node.z) {
            const distance = 640;
            const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
            const newPos = {
                x: node.x * distRatio,
                y: node.y * distRatio,
                z: node.z * distRatio,
            };

            this.Graph.cameraPosition(newPos, node, 3000);
            this.selectedNode = null;
            this.resetNodeColor();
            this.selectedNode = node;
            this.onNodeHover(node)
        }
    }

    focusGraphTag(tag: string) {
        this.focusGraphNodeById(tag);
    }

    // 添加按钮

    createButton(buttonText: string, buttonClass: string, buttonCallback: () => void): HTMLElement {
        const button = document.createEl('div').createEl('button', { text: buttonText, cls: buttonClass });
        button.addEventListener('click', buttonCallback);
        return button;
    }
    onLinkDistance(value: number) {
        this.Graph.d3Force('link').distance(value * 10);
        this.Graph.d3ReheatSimulation();
        this.plugin.settings.link_distance = value
    }
    onLinkWidth(value: number) {
        this.Graph.linkWidth((link: any) => this.highlightLinks.has(link) ? 2 * value : value)
        this.plugin.settings.link_width = value
    }
    onLinkParticleNumber(value: number) {
        this.Graph.linkDirectionalParticles((link: any) => this.highlightLinks.has(link) ? value * 2 : value)
        this.plugin.settings.link_particle_number = value
    }
    onLinkParticleSize(value: number) {
        this.Graph.linkDirectionalParticleWidth((link: any) => this.highlightLinks.has(link) ? value * 2 : value)

        this.plugin.settings.link_particle_size = value
    }
    onLinkParticleColor(value: string) {
        this.Graph.linkDirectionalParticleColor((link: any) => this.highlightLinks.has(link) ? '#ff00ff' : value)
        this.plugin.settings.link_particle_color = value;
    }
    onText(value: string) {
    }
    onNodeSize(value: number) {
        this.Graph.nodeThreeObject((node: ExtendedNodeObject) => {
            let nodeSize = (node.connections || 1)
            if (node.type === 'tag') nodeSize = (node.instanceNum || 1)
            nodeSize = Math.log2(nodeSize) * value;

            const geometry = new THREE.SphereGeometry(nodeSize < 3 ? 3 : nodeSize, 16, 16);
            let color = this.getColorByType(node);
            const material = new THREE.MeshBasicMaterial({ color });
            return new THREE.Mesh(geometry, material);
        })
        this.plugin.settings.node_repulsion = value;
    }
    onNodeRepulsion(value: number) {
        this.Graph.d3Force('charge').strength(-30 - value * 300);
        this.Graph
            .d3Force("x", d3.forceX(0).strength(0.19))
            .d3Force("y", d3.forceY(0).strength(0.19))
            .d3Force("z", d3.forceZ(0).strength(0.19))
        this.Graph.d3ReheatSimulation();
        this.plugin.settings.node_repulsion = value;
        return;
    }

    connectExcalidrawNodes() {
        // 提取所有未连接的 excalidraw 类型节点
        const unconnectedExcalidrawNodes = this.gData.nodes.filter(
            (node: ExtendedNodeObject) => node.type === 'excalidraw' && !this.gData.links.some(link => link.sourceId === node.id || link.targetId === node.id)
        );
        if (unconnectedExcalidrawNodes.length === 0) return;
        // 创建一个新的 excalidraw 节点
        const newExcalidrawNode: ExtendedNodeObject = {
            id: 'excalidraw',
            type: 'excalidraw',
            x: 0,
            y: 0,
            z: 0,
            connections: 0
        };

        // 将新节点添加到节点列表中
        this.gData.nodes.push(newExcalidrawNode);

        // 将未连接的 excalidraw 节点连接到新节点
        unconnectedExcalidrawNodes.forEach((node: ExtendedNodeObject) => {
            this.gData.links.push({ source: newExcalidrawNode.id, target: node.id, sourceId: newExcalidrawNode.id, targetId: node.id });
            newExcalidrawNode.connections! += 1;
            node.connections = (node.connections || 0) + 1;
        });

        // 重新渲染 Graph
        this.Graph.graphData(this.gData);
    }
    // 恢复 UnlinkedExcalidrawNodes 节点的方法
    resetUnlinkedExcalidrawNodes() {
        // 移除所有连接到 broken 节点的链接

        this.gData.links = this.gData.links.filter(link => link.sourceId !== 'excalidraw' && link.targetId !== 'excalidraw');

        // 移除 broken 节点
        this.gData.nodes = this.gData.nodes.filter(node => node.id !== 'excalidraw');

        // 重新计算连接数
        this.calculateConnections();

        // 更新图表数据
        this.Graph.graphData(this.gData);
    }
    // 连接所有 broken 节点的方法
    connectBrokenNodes(linkStar: boolean) {
        let links: LinkObject[] = this.gData.links;
        let nodes: ExtendedNodeObject[] = this.gData.nodes;

        if (nodes.filter(node => node.id === 'broken').length != 0) {
            console.log(" has broken node, return.")
            return;
        }
        // 创建一个新的 broken 节点
        const brokenNode: ExtendedNodeObject = {
            id: 'broken',
            type: 'broken',
            x: 0,
            y: 0,
            z: 0,
            connections: 0
        };
        if (linkStar) {
            // 找到所有 type 为 broken 的节点
            const brokenNodes = this.gData.nodes.filter(node => node.type === 'broken');
            console.log("broken nodes number: ", brokenNodes.length)
            // 将所有 broken 节点连接到新创建的 broken 节点上
            brokenNodes.forEach(node => {
                links.push({ source: brokenNode.id, target: node.id, sourceId: brokenNode.id, targetId: node.id });
            });
        } else {

            // 将所有 broken 节点以一条线连接起来
            const brokenNodes = this.gData.nodes.filter(node => node.type === 'broken');
            console.log("broken nodes number: ", brokenNodes.length)
            for (let i = 0; i < brokenNodes.length - 1; i++) {
                links.push({ source: brokenNodes[i].id, target: brokenNodes[i + 1].id, sourceId: brokenNodes[i].id, targetId: brokenNodes[i + 1].id });
            }
        }

        // 将新创建的 broken 节点添加到节点列表中
        nodes.push(brokenNode);
        //统计connections数量 
        // 计算每个节点的连接数
        nodes.forEach((node: ExtendedNodeObject) => {
            node.connections = links.filter(link => link.sourceId === node.id || link.targetId === node.id).length;
        });
        this.gData = { nodes: nodes, links: links };

        // 重新计算连接数
        //this.calculateConnections();

        // 更新图表数据
        this.Graph.graphData(this.gData);
    }

    // 恢复 broken 节点的方法
    resetBrokenNodes() {
        // 移除所有连接到 broken 节点的链接
        let links: LinkObject[] = [];
        let nodes: ExtendedNodeObject[] = [];
        if (0) {
            this.gData.links = this.gData.links.filter(link => link.sourceId !== 'broken' && link.targetId !== 'broken');
        } else {
            links = this.gData.links.filter((link: LinkObject) => (link.source as any).type !== 'broken');
        }
        // 移除 broken 节点

        nodes = this.gData.nodes.filter(node => node.id !== 'broken');
        //统计connections数量 
        // 计算每个节点的连接数
        nodes.forEach((node: ExtendedNodeObject) => {
            node.connections = links.filter(link => link.sourceId === node.id || link.targetId === node.id).length;
        });
        // 重新计算连接数
        // 更新图表数据
        this.gData = { nodes: (nodes as any), links: links }
        this.Graph.graphData(this.gData);
        //console.log("2after fileter num:", nodes1.length, " this gdata num:", this.gData.nodes.length)
    }

    // 计算连接数的方法
    calculateConnections() {
        const nodes: ExtendedNodeObject[] = this.gData.nodes;
        nodes.forEach((node: ExtendedNodeObject) => {
            node.connections = this.gData.links.filter(link => link.sourceId === node.id || link.targetId === node.id).length;
        });
        this.gData.nodes = nodes;
    }


    getCache() {

        //	this.app.vault.getMarkdownFiles().forEach(file => {
        this.app.vault.getFiles()
            //			this.app.vault.getAllLoadedFiles()
            .forEach(file => {
                const cache = this.app.metadataCache.getCache(file.path);
                filesDataMap.set(file.path, cache);
            });
        //  console.log("all resolved links: ", this.app.metadataCache.resolvedLinks);
    }
    getColorByType(node: Node) {
        let color;
        switch (node.type) {
            case 'md':
                color = '#00ff00'; // 绿色
                break;
            case 'tag':
                color = '#ff00ff'; // 粉色
                break;
            case 'attachment':
                color = '#ffff00'; // 黄色
                break;
            case 'broken':
                color = '#770000'  // 红色
                break;
            case 'excalidraw':
                color = '#00ffff'  // 青色
                break;
            default:
                color = '#ffffff'; // 默认颜色
        }
        return color;
    }
    buildGdata(): GraphData {
        const nodes: ExtendedNodeObject[] = [];
        const links: LinkObject[] = [];
        const tagSet: Set<string> = new Set();
        const tagLinks: Set<string> = new Set();
        let fileNodeNum = 0;
        let FileLinkNum = 0;
        let TagNodeNum = 0;
        let TagLinkNum = 0;

        const resolvedLinks = this.app.metadataCache.resolvedLinks;
        //   const tagCount: Set<string> = new Set(); // 初始化标签计数对象
        const tagCount: Map<string, number> = new Map(); // 初始化标签计数对象
        // 添加resolved links来创建文件间的关系，和文件节点
        for (const sourcePath in resolvedLinks) {
            if (!nodes.some(node => node.id == sourcePath)) {
                nodes.push({ id: sourcePath, type: getFileType(sourcePath) });
            }
            const targetPaths = resolvedLinks[sourcePath];
            for (const targetPath in targetPaths) {
                // 确保目标文件也在图中
                if (!nodes.some(node => node.id == targetPath)) {
                    nodes.push({ id: targetPath, type: getFileType(targetPath) });
                }
                // 创建链接
                links.push({ source: sourcePath, target: targetPath, sourceId: sourcePath, targetId: targetPath });
            }
        }
        fileNodeNum = nodes.length;
        FileLinkNum = links.length;
        this.debugLogToFile("", true)
        this.debugLogToFile(`|File parse completed=>|| markdown and linked files nodes:| ${nodes.length}| total file links:| ${links.length}|`)

        filesDataMap.forEach((cache, filePath) => {
            const fileTags = getTags(cache);

            // 确保目标文件也在图中
            if (!nodes.some(node => node.id == filePath)) {
                nodes.push({ id: filePath, type: 'broken' });
            }
            /* 文件只与根标签联接 */
            const rootTags = new Set<string>();
            fileTags.forEach(tag => {
                const tagParts = tag.tag.split('/');
                rootTags.add(tagParts[0]);
                // 更新标签计数，包括所有父标签
                tagParts.forEach((_, i) => {
                    const tagPart = tagParts.slice(0, i + 1).join('/');
                    tagCount.set(tagPart, (tagCount.get(tagPart) || 0) + 1);
                });
            });

            rootTags.forEach(rootTag => {
                links.push({ source: filePath, target: rootTag, sourceId: filePath, targetId: rootTag });
            });

            // 创建标签之间的链接
            fileTags.forEach(tag => {
                const tagParts = parseTagHierarchy(tag.tag);// tag.tag.split('/');
                for (let i = 0; i < tagParts.length; i++) {
                    const tagPart = tagParts[i];
                    if (!tagSet.has(tagPart)) {
                        nodes.push({ id: tagPart, type: 'tag' });
                        tagSet.add(tagPart);
                    }
                    if (i > 0) {
                        const parentTag = tagParts[i - 1];
                        const linkKey = `${parentTag}->${tagPart}`;
                        if (!tagLinks.has(linkKey)) {
                            links.push({ source: parentTag, target: tagPart, sourceId: parentTag, targetId: tagPart });
                            tagLinks.add(linkKey);
                        }
                    }
                }
            });
        });
        //markdwon + orphan + tags
        const brokennum = nodes.filter(node => node.type == 'broken').length;
        this.debugLogToFile(`|add tags and other files=>||  total nodes: |${nodes.length}|  total links:| ${links.length}|`)
        TagNodeNum = nodes.length - fileNodeNum - brokennum;
        TagLinkNum = links.length - FileLinkNum;
        // 过滤节点和链接
        // 直接移除满足条件的节点
        for (let i = nodes.length - 1; i >= 0; i--) {
            if (shouldRemove(nodes[i].id, filterStrings)) {
                nodes.splice(i, 1);
            }
        }

        // 直接移除满足条件的链接
        for (let i = links.length - 1; i >= 0; i--) {
            if (shouldRemove(links[i].sourceId, filterStrings) || shouldRemove(links[i].targetId, filterStrings)) {
                links.splice(i, 1);
            }
        }
        this.debugLogToFile(`|After filtered pathes=>|| filtered nodes: |${TagNodeNum + fileNodeNum +brokennum- nodes.length}|  links:| ${links.length}|`)
        // 计算每个节点的连接数
        nodes.forEach((node: ExtendedNodeObject) => {
            //    node.connections = links.filter(link => link.source === node.id || link.target === node.id).length;
            node.connections = links.filter(link => link.sourceId === node.id || link.targetId === node.id).length;
            //     node.size = Math.log2(node.connections + 1) * 5
            node.size = node.connections;

        });

        // 设置tag类型节点的instanceNum值并根据该值调整大小
        nodes.forEach((node: ExtendedNodeObject) => {
            if (node.type === 'tag') {
                node.instanceNum = tagCount.get(node.id) || 1;
                // 根据instanceNum调整节点大小，可以按比例调整
                //        node.size = Math.log2(node.instanceNum + 1) * 5; // 例如，使用对数比例调整大小
                node.size = node.instanceNum;
            }
        });




        // cross-link node objects
        links.forEach(link => {
            const a = nodes.find(node => node.id === link.sourceId) as ExtendedNodeObject;
            const b = nodes.find(node => node.id === link.targetId) as ExtendedNodeObject;
            !a.neighbors && (a.neighbors = []);
            !b.neighbors && (b.neighbors = []);
            a.neighbors.push(b);
            b.neighbors.push(a);

            !a.links && (a.links = []);
            !b.links && (b.links = []);
            a.links.push(link);
            b.links.push(link);
        });
        this.debugLogToFile(`|Tags parse completed=>||  tag nodes: |${TagNodeNum}| tag links:| ${TagLinkNum}|`)
        this.debugLogToFile("|tags num:| " +  (TagNodeNum)  + "| broken files: |" + brokennum + "| tag links:| " + (links.length - FileLinkNum + "|"))
        if (this.plugin.settings.enableShow)
        {
            showFile(logFilePath);
        }


        return { nodes: nodes, links: links };
    }
    distanceFactor: number = 2;
    createGraph(container: HTMLElement) {

        // 打印结果
        container.addClass("tags-routes")
        const graphContainer = container.createEl('div', { cls: 'graph-container' });
        this.Graph = ForceGraph3D()
            .width(container.clientWidth)
            .height(container.clientHeight)
            .backgroundColor("#000003")
            .d3Force('link', d3.forceLink().distance((link: any) => {
                const distance = Math.max(link.source.connections, link.target.connections, link.source.instanceNum || 2, link.target.instanceNum || 2);
                return distance < 10 ? 20 : distance * this.distanceFactor;
            }))
            (graphContainer)
            .linkWidth((link: any) => this.highlightLinks.has(link) ? 2 : 1)
            .linkDirectionalParticles((link: any) => this.highlightLinks.has(link) ? 4 : 2)
            .linkDirectionalParticleWidth((link: any) => this.highlightLinks.has(link) ? 3 : 0.5)
            .linkDirectionalParticleColor((link: any) => this.highlightLinks.has(link) ? '#ff00ff' : '#ffffff')
            .nodeLabel((node: any) => node.type == 'tag' ? `${node.id} (${node.instanceNum})` : `${node.id} (${node.connections})`)
            .nodeOpacity(0.9)
            .nodeThreeObject((node: ExtendedNodeObject) => {
                let nodeSize = (node.connections || 1)
                if (node.type === 'tag') nodeSize = (node.instanceNum || 1)
                nodeSize = Math.log2(nodeSize) * 5;
                const geometry = new THREE.SphereGeometry(nodeSize < 3 ? 3 : nodeSize, 16, 16);
                let color = this.getColorByType(node);
                const material = new THREE.MeshBasicMaterial({ color });
                return new THREE.Mesh(geometry, material);
            })
            .onNodeClick((node: ExtendedNodeObject) => {
                const distance = 640;
                const distRatio = 1 + distance / Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0);
                const newPos = node.x || node.y || node.z
                    ? { x: (node.x ?? 0 ) * distRatio, y: (node.y ?? 0) * distRatio, z: (node.z ?? 0) * distRatio }
                    : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

                this.Graph.cameraPosition(
                    newPos, // new position
                    { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0}, 
                    3000  // ms transition duration
                );

                this.handleNodeClick(node);
                this.resetNodeColor();
                this.selectedNode = node;
                this.onNodeHover(node);
            })
            .onBackgroundClick(() => {
                this.selectedNode = null;
                this.resetNodeColor();
            })
            .onNodeDragEnd((node: any) => {
                node.fx = node.x;
                node.fy = node.y;
                node.fz = node.z;
            })
            .onNodeHover((node: ExtendedNodeObject) => this.onNodeHover(node))
            .onLinkHover((link: any) => this.onLinkHover(link))
            .cooldownTicks(10000)
        //Graph.onEngineStop(()=>Graph.zoomToFit(4000))  //自动复位
        const bloomPass = new (UnrealBloomPass as any)(container.clientWidth, container.clientHeight)
        bloomPass.strength = 2.0;
        bloomPass.radius = 1;
        bloomPass.threshold = 0;
        this.Graph.postProcessingComposer().addPass(bloomPass);

        // 使用 MutationObserver 监听容器大小变化
        const observer = new MutationObserver(() => {
            const newWidth = container.clientWidth
            const newHeight = container.clientHeight;
            this.Graph.width(newWidth).height(newHeight);
        });
        observer.observe(container, { attributes: true, childList: true, subtree: true });
        // 清理 observer
        this.register(() => observer.disconnect());
        new settingGroup("Tags' route settings", "Tags' route settings", true).hide()
            .add({
                arg: (new settingGroup("commands", "Node commands"))
                    .addButton("Link borken as star", "graph-button", () => { this.connectBrokenNodes(true) })
                    .addButton("Link borken as line", "graph-button", () => { this.connectBrokenNodes(false) })
                    .addButton("Unlink borken", "graph-button", () => { this.resetBrokenNodes() })
                    .addButton("Link excalidraw", "graph-button", () => { this.connectExcalidrawNodes() })
                    .addButton("Unlink excalidraw", "graph-button", () => { this.resetUnlinkedExcalidrawNodes() })
                    .addButton("Reset graph", "graph-button", () => { this.Graph.graphData(this.gData = this.buildGdata()) })
            })
            .add({
                arg: (new settingGroup("control sliders", "Display control"))
                    .addSlider("Node size", 1, 10, 1, 5, this.onNodeSize)
                    .addSlider("Node repulsion", 0, 10, 1, 0, this.onNodeRepulsion)
                    .addSlider("Link distance", 1, 25, 1, 5, this.onLinkDistance)
                    .addSlider("Link Width", 1, 5, 1, 1, this.onLinkWidth)
                    .addSlider("Link Particle size", 1, 5, 1, 2, this.onLinkParticleSize)
                    .addSlider("Link Particle number", 1, 5, 1, 2, this.onLinkParticleNumber)
                    .addColorPicker("Link Particle color", this.onLinkParticleColor)
            })
         //   .add({
         //       arg: (new settingGroup("file filter", "File filter"))
         //           .addText("Filter path1", this.onText)
         //   })
            .attachEl(graphContainer.createEl('div', { cls: 'settings-container' }))
            .hideAll();
    }
    // 点击节点后的处理函数
    handleTagClick(node: ExtendedNodeObject) {
        if (node.type === 'tag') {
            const sanitizedId = node.id.replace(/\//g, '__');
            const newFilePath = `TagsRoutes/TagReport_${sanitizedId}.md`; // 新文件的路径和名称
            const fileContent1 = `---\ntags:\n  - tag-report\n---\n
\`\`\`dataviewjs
await dv.view("scripts/tag-report", "${node.id}")
\`\`\`
			`; // 要写入的新内容

            this.createAndWriteToFile(newFilePath, fileContent1);
        }
    }
    // 创建文件并写入内容的函数
    async createAndWriteToFile(filePath: string, content: string) {
        const { vault } = this.app;

        // 检查文件是否已经存在
        if (!vault.getAbstractFileByPath(filePath)) {
            await vault.create(filePath, content);
            console.log("create query file.")
        } else {
            // 如果文件已经存在，可以选择覆盖内容或者追加内容
            const file = vault.getAbstractFileByPath(filePath);
            if (file instanceof TFile) {
                await vault.modify(file, content); // 这里是覆盖内容
            }
        }
        // 打开新创建的文件
        const file = vault.getAbstractFileByPath(filePath)
        if (file && file instanceof TFile) {
            const leaf = this.app.workspace.getLeaf(false);
            await leaf.openFile(file)
            setViewType(leaf.view,"preview")
        }
    }
    async debugLogToFile(content: string, head: boolean = false) {
        if (!this.plugin.settings.enableSave) return;
        const { vault } = this.app;

        
        // 检查文件是否已经存在
        if (!vault.getAbstractFileByPath(logFilePath)) {
            await vault.create(logFilePath, content);
//            console.log("create log file.")
        }  {
            // 如果文件已经存在，可以选择覆盖内容或者追加内容
            const file = vault.getAbstractFileByPath(logFilePath);
        //    console.log("using existing log file")
            if (file instanceof TFile) {
                if (!head) {
                    await vault.append(file, "|[" + moment(new Date()).format('YYYY-MM-DD HH:mm:ss') + "] " + content + "\n"); // 这里是追加内容
                } else {
                    await vault.append(file, "\n\n||||||||\n|-:|-:|-:|-:|-:|-:|-:|\n"); // 这里是追加内容
                }
            }
        }


    }
    async handleNodeClick(node: ExtendedNodeObject) {
        const filePath = node.id;
        const { workspace, vault } = this.app

        if (node.type !== 'tag') {
            const file = vault.getAbstractFileByPath(filePath);

            if (!file || !(file instanceof TFile)) {
                console.log("file not found ", filePath)
                return;
            }
            const leaf: WorkspaceLeaf = workspace.getLeaf(false);
            await leaf.openFile(file);
            // 切换到阅读模式
            const view = this.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView;
            setViewType(view, "preview");
        } else {
            this.handleTagClick(node);
        }
    }
    // view的open 事件
    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        //	container.createEl("h4", { text: "This is for tags routes." });
        this.getCache();
        this.gData = this.buildGdata();
        this.createGraph(container as HTMLElement);
        this.Graph.graphData(this.gData);
    }
    // view 的close 事件
    async onClose() {
        // Nothing to clean up.
    }
}

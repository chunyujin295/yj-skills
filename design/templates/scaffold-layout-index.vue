<template>
  <div class="app-wrapper">
    <div class="navbar">
      <div class="logo">
        <i class="el-icon-s-check"></i>
        <span>{{PROJECT_TITLE}}</span>
      </div>
    </div>
    <div class="layout-body">
      <sidebar class="sidebar-container" />
      <div class="main-content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script>
import Sidebar from './components/Sidebar'

export default {
  name: 'Layout',
  components: { Sidebar }
}
</script>

<style lang="scss" scoped>
.app-wrapper {
  height: 100%;
}
.navbar {
  height: 50px;
  background: #1f2227;
  display: flex;
  align-items: center;
  padding: 0 20px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    i { font-size: 22px; }
  }
}
.layout-body {
  display: flex;
  height: calc(100vh - 50px);
}
.sidebar-container {
  width: 200px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  overflow-y: auto;
}
.main-content {
  flex: 1;
  background: #f5f5f5;
  overflow-y: auto;
}
</style>

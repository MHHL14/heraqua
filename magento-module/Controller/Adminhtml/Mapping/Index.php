<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Controller\Adminhtml\Mapping;

use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\View\Result\Page;
use Magento\Framework\View\Result\PageFactory;

class Index extends Action
{
    public const ADMIN_RESOURCE = 'Herqua_Schoenadviseur::mapping';

    public function __construct(
        Context $context,
        private readonly PageFactory $pageFactory
    ) {
        parent::__construct($context);
    }

    public function execute(): Page
    {
        $page = $this->pageFactory->create();
        $page->setActiveMenu('Herqua_Schoenadviseur::mapping');
        $page->getConfig()->getTitle()->prepend(__('Herqua Field Mapping'));
        return $page;
    }
}
